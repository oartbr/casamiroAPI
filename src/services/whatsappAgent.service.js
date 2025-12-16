const { tool, Agent, Runner, withTrace } = require('@openai/agents');
const { z } = require('zod');
const { userCommService } = require('./index');
const logger = require('../config/logger');

// Tool definitions
const getUserInfoByPhone = tool({
  name: 'getUserInfoByPhone',
  description:
    'Fetch the user information, groups, and lists linked to a phone number and check if it is linked to an active user.',
  parameters: z.object({
    phone_number: z.string(),
  }),
  execute: async (input) => {
    try {
      const context = await userCommService.getUserContext(input.phone_number);
      return {
        success: true,
        data: context,
      };
    } catch (error) {
      logger.error('Error in getUserInfoByPhone tool:', error);
      return {
        success: false,
        message: error.message || 'User not found or inactive',
      };
    }
  },
});

const addItemsToList = tool({
  name: 'addItemsToList',
  description: 'Add one or more items to a specific list. Requires list_id and an array of item texts.',
  parameters: z.object({
    list_id: z.string(),
    phone_number: z.string(),
    items: z.array(z.string()),
  }),
  execute: async (input) => {
    try {
      logger.info('addItemsToList tool called', {
        list_id: input.list_id,
        phone_number: input.phone_number,
        items_count: input.items ? input.items.length : 0,
        items: input.items,
      });

      // Clean phone number - remove + and any non-numeric characters
      let cleanPhoneNumber = input.phone_number;
      if (typeof cleanPhoneNumber === 'string') {
        cleanPhoneNumber = cleanPhoneNumber.replace(/^\+/, '').replace(/\D/g, '');
      }

      const list = await userCommService.addItemsToList(input.list_id, cleanPhoneNumber, input.items);

      logger.info('addItemsToList tool succeeded', {
        listId: list._id.toString(),
        listName: list.name,
        itemsAdded: input.items.length,
        totalItemsInList: list.items.length,
      });

      return {
        success: true,
        message: `Added ${input.items.length} item(s) to the list`,
        data: {
          listId: list._id.toString(),
          listName: list.name,
          itemsAdded: input.items.length,
        },
      };
    } catch (error) {
      logger.error('Error in addItemsToList tool:', {
        error: error.message,
        stack: error.stack,
        input: {
          list_id: input.list_id,
          phone_number: input.phone_number,
          items: input.items,
        },
      });
      return {
        success: false,
        message: error.message || 'Failed to add items to list',
      };
    }
  },
});

const removeItemsFromList = tool({
  name: 'removeItemsFromList',
  description:
    'Remove one or more items from a specific list by matching item text. Requires list_id and an array of item texts to remove.',
  parameters: z.object({
    list_id: z.string(),
    phone_number: z.string(),
    items: z.array(z.string()),
  }),
  execute: async (input) => {
    try {
      const result = await userCommService.removeItemsFromList(input.list_id, input.phone_number, input.items);
      return {
        success: true,
        message: result.message,
        data: {
          listId: result.list._id.toString(),
          listName: result.list.name,
          itemsRemoved: result.removedCount,
        },
      };
    } catch (error) {
      logger.error('Error in removeItemsFromList tool:', error);
      return {
        success: false,
        message: error.message || 'Failed to remove items from list',
      };
    }
  },
});

const getListById = tool({
  name: 'getListById',
  description: 'Get a complete list with all items by list ID. Requires list_id and phone_number.',
  parameters: z.object({
    list_id: z.string(),
    phone_number: z.string(),
  }),
  execute: async (input) => {
    try {
      const list = await userCommService.getListById(input.list_id, input.phone_number);
      return {
        success: true,
        data: list,
      };
    } catch (error) {
      logger.error('Error in getListById tool:', error);
      return {
        success: false,
        message: error.message || 'Failed to get list',
      };
    }
  },
});

// Shared client for OpenAI (for future guardrails implementation)
// const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Guardrails configuration (simplified - you may need to install @openai/guardrails)
// const guardrailsConfig = {
//   guardrails: [
//     { name: 'Jailbreak', config: { model: 'gpt-4o-mini', confidence_threshold: 0.7 } },
//   ],
// };

// Simplified guardrails check (if @openai/guardrails is not available, this will be a no-op)
async function runAndApplyGuardrails(inputText) {
  // TODO: Implement guardrails if @openai/guardrails package is installed
  // For now, return safe defaults
  return {
    hasTripwire: false,
    safeText: inputText,
    failOutput: null,
    passOutput: { safe_text: inputText },
  };
}

// Schema definitions
const ClassificationAgentSchema = z.object({
  classification: z.enum(['add_to_list', 'remove_from_list', 'show_list']),
});

const IsphonenumberauserSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      user: z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        phoneNumber: z.number(),
      }),
      groups: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          isDefault: z.boolean(),
        })
      ),
      lists: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          groupId: z.string(),
          groupName: z.string(),
          isDefault: z.boolean(),
        })
      ),
    })
    .nullish(), // Use nullish() instead of optional() to support both null and undefined
});

// Agent definitions
const classificationAgentInstructions = (runContext) => {
  const { workflowInputAsText } = runContext.context;
  return `Classify the user's intent, ${workflowInputAsText}, into one of the following categories: "add_to_list", "remove_from_list", or "show_list".  

1. Any request to add an item to a list should route to add_to_list.
2. Any request that indicates that the user wants to remove a certain item from the list, should be listed as remove_from_list.
3. If the user wants to see the list, it should be set to show_list.`;
};

const classificationAgent = new Agent({
  name: 'Classification Agent',
  instructions: classificationAgentInstructions,
  model: 'gpt-4o',
  outputType: ClassificationAgentSchema,
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
});

const isphonenumberauserInstructions = (runContext) => {
  const { statePhoneNumber } = runContext.context;
  return `Get the original ${statePhoneNumber} received at the start, and use the get_user_info_by_phone tool to check if the user is actually registered and active. 

Return the object received from the app or false.`;
};

const isphonenumberauser = new Agent({
  name: 'isPhoneNumberAUser',
  instructions: isphonenumberauserInstructions,
  model: 'gpt-4o',
  tools: [getUserInfoByPhone],
  outputType: IsphonenumberauserSchema,
  modelSettings: {
    temperature: 1,
    topP: 1,
    parallelToolCalls: true,
    maxTokens: 2048,
    store: true,
  },
});

// Agent for adding items to list - instructions will be set dynamically
const additem2listInstructions = (runContext) => {
  const { userContext } = runContext.context || {};
  console.log(userContext, userContext.lists, userContext.lists);
  let instructions = `You are an assistant that helps users add items to their shopping lists.

IMPORTANT: You MUST use the tools to add items. Do not just respond with text.

When a user wants to add items, follow these steps:
1. Identify which list to add to:
   - If the user specifies a list name, find the matching list_id from the available lists
   - If no list is specified, use the default list (the one with isDefault: true)
   - If there are multiple default lists, use the first one
2. Extract the items the user wants to add from their message
   - Items can be separated by commas, "and", or new lines
   - Clean up the item names (remove extra spaces, punctuation)
3. Call the addItemsToList tool with:
   - list_id: the ID of the list (as a string)
   - phone_number: the user's phone number (from context)
   - items: an array of item strings (e.g., ["milk", "bread"])
4. After successfully adding items, respond with a friendly confirmation message mentioning what was added

Example:
User: "Add milk and bread"
You should:
1. Find the default list_id from available lists
2. Call addItemsToList with list_id, phone_number, and items: ["milk", "bread"]
3. Respond: "I've added milk and bread to your list!"`;

  // Add available lists to instructions if provided
  if (userContext && userContext.lists && userContext.lists.length > 0) {
    instructions += `\n\nAvailable lists:\n${JSON.stringify(
      userContext.lists,
      null,
      2
    )}\n\nUse the default list (isDefault: true) if no list is specified.`;
  } else {
    instructions += "\n\nIf you need to get the user's lists, use the getUserInfoByPhone tool first.";
  }

  return instructions;
};

const additem2list = new Agent({
  name: 'addItem2List',
  instructions: additem2listInstructions,
  model: 'gpt-4o',
  tools: [getUserInfoByPhone, addItemsToList],
  modelSettings: {
    temperature: 0.7,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
});

// Agent for removing items from list
const removeItemAgent = new Agent({
  name: 'removeItemAgent',
  instructions: `You are an assistant that helps users remove items from their shopping lists.
When a user wants to remove items, you should:
1. Identify which list they want to remove from (use default list if not specified)
2. Extract the items they want to remove
3. Use the removeItemsFromList tool with the list_id, phone_number, and items array
4. Respond with a friendly confirmation message`,
  model: 'gpt-4o',
  tools: [getUserInfoByPhone, removeItemsFromList],
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
});

// Agent for showing list
const showListAgent = new Agent({
  name: 'showListAgent',
  instructions: `You are an assistant that helps users view their shopping lists.
When a user wants to see a list, you should:
1. Identify which list they want to see (use default list if not specified)
2. Use the getListById tool with the list_id and phone_number
3. Format the list items in a readable way
4. Respond with a friendly message showing the list`,
  model: 'gpt-4o',
  tools: [getUserInfoByPhone, getListById],
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
});

/**
 * Main workflow function
 * @param {Object} workflow - Workflow input
 * @param {string} workflow.input_as_text - The user's message text
 * @param {string} workflow.phone_number - The user's phone number
 * @returns {Promise<Object>} Workflow result
 */
const runWorkflow = async (workflow) => {
  // Remove unnecessary 'await' on return value per lint warning
  return withTrace('New agent', async () => {
    const state = {
      phone_number: workflow.phone_number || null,
    };

    const conversationHistory = [
      {
        role: 'user',
        content: [{ type: 'input_text', text: workflow.input_as_text }],
      },
    ];

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: 'agent-builder',
        workflow_id: 'wf_69405305304c819097121511fc3d036f015ef6ca1d920374',
      },
    });

    const guardrailsInputText = workflow.input_as_text;
    const {
      hasTripwire: guardrailsHasTripwire,
      failOutput: guardrailsFailOutput,
      passOutput: guardrailsPassOutput,
    } = await runAndApplyGuardrails(guardrailsInputText);

    // FIX: Use correct 'guardrailsPassOutput' instead of undefined 'passOutput'
    const guardrailsOutput = guardrailsHasTripwire ? guardrailsFailOutput : guardrailsPassOutput;

    if (guardrailsHasTripwire) {
      return guardrailsOutput;
    }

    // Check if phone number is a user
    const isphonenumberauserResultTemp = await runner.run(isphonenumberauser, [...conversationHistory], {
      context: {
        statePhoneNumber: state.phone_number,
      },
    });

    conversationHistory.push(...isphonenumberauserResultTemp.newItems.map((item) => item.rawItem));

    if (!isphonenumberauserResultTemp.finalOutput) {
      throw new Error('Agent result is undefined');
    }

    const isphonenumberauserResult = {
      output_text: JSON.stringify(isphonenumberauserResultTemp.finalOutput),
      output_parsed: isphonenumberauserResultTemp.finalOutput,
    };

    if (isphonenumberauserResult.output_parsed.success === true) {
      // Classify the intent
      const classificationAgentResultTemp = await runner.run(classificationAgent, [...conversationHistory], {
        context: {
          workflowInputAsText: workflow.input_as_text,
        },
      });

      conversationHistory.push(...classificationAgentResultTemp.newItems.map((item) => item.rawItem));

      if (!classificationAgentResultTemp.finalOutput) {
        throw new Error('Agent result is undefined');
      }

      const classificationAgentResult = {
        output_text: JSON.stringify(classificationAgentResultTemp.finalOutput),
        output_parsed: classificationAgentResultTemp.finalOutput,
      };

      let agentResult;

      if (classificationAgentResult.output_parsed.classification === 'add_to_list') {
        logger.info('Running addItem2List agent', {
          phoneNumber: state.phone_number,
          hasUserContext: !!isphonenumberauserResult.output_parsed.data,
        });

        // Get user context data
        const userContextData = isphonenumberauserResult.output_parsed.data;

        // Pass context through the context parameter instead of adding to conversation history
        // This avoids format issues with the agents library
        const additem2listResultTemp = await runner.run(additem2list, [...conversationHistory], {
          context: {
            phoneNumber: state.phone_number,
            userContext: userContextData,
          },
        });

        // Log tool calls for debugging
        const newItems = additem2listResultTemp.newItems || [];
        const toolCalls = newItems.filter(
          (item) =>
            (item.rawItem && item.rawItem.role === 'tool') ||
            (item.rawItem && item.rawItem.content && item.rawItem.content.some((c) => c.type === 'tool_call'))
        );

        // Log detailed information about tool calls
        const toolCallDetails = newItems
          .map((item) => {
            if (item.rawItem && item.rawItem.role === 'tool') {
              return {
                role: item.rawItem.role,
                name: item.rawItem.name,
                content: item.rawItem.content ? JSON.stringify(item.rawItem.content).substring(0, 200) : 'no content',
              };
            }
            if (item.rawItem && item.rawItem.content) {
              const toolCall = item.rawItem.content.find((c) => c.type === 'tool_call');
              if (toolCall) {
                return {
                  role: 'assistant',
                  toolCall: toolCall.name,
                  arguments: toolCall.arguments ? JSON.stringify(toolCall.arguments).substring(0, 200) : 'no args',
                };
              }
            }
            return null;
          })
          .filter((item) => item !== null);

        logger.info('addItem2List agent completed', {
          hasFinalOutput: !!additem2listResultTemp.finalOutput,
          finalOutput: additem2listResultTemp.finalOutput
            ? String(additem2listResultTemp.finalOutput).substring(0, 200)
            : null,
          newItemsCount: newItems.length,
          toolCallsCount: toolCalls.length,
          toolCallDetails,
        });

        conversationHistory.push(...additem2listResultTemp.newItems.map((item) => item.rawItem));

        if (!additem2listResultTemp.finalOutput) {
          logger.warn('addItem2List agent returned no output', {
            newItems: newItems.length,
            toolCallsCount: toolCalls.length,
          });
          // If tools were called, assume success even without text output
          if (toolCalls && toolCalls.length > 0) {
            agentResult = {
              output_text: "I've added the items to your list!",
            };
          } else {
            throw new Error('Agent result is undefined and no tools were called');
          }
        } else {
          agentResult = {
            output_text: additem2listResultTemp.finalOutput || '',
          };
        }
      } else if (classificationAgentResult.output_parsed.classification === 'remove_from_list') {
        const removeItemResultTemp = await runner.run(removeItemAgent, [...conversationHistory], {
          context: {
            phoneNumber: state.phone_number,
            userContext: isphonenumberauserResult.output_parsed.data,
          },
        });

        conversationHistory.push(...removeItemResultTemp.newItems.map((item) => item.rawItem));

        if (!removeItemResultTemp.finalOutput) {
          throw new Error('Agent result is undefined');
        }

        agentResult = {
          output_text: removeItemResultTemp.finalOutput || '',
        };
      } else if (classificationAgentResult.output_parsed.classification === 'show_list') {
        const showListResultTemp = await runner.run(showListAgent, [...conversationHistory], {
          context: {
            phoneNumber: state.phone_number,
            userContext: isphonenumberauserResult.output_parsed.data,
          },
        });

        conversationHistory.push(...showListResultTemp.newItems.map((item) => item.rawItem));

        if (!showListResultTemp.finalOutput) {
          throw new Error('Agent result is undefined');
        }

        agentResult = {
          output_text: showListResultTemp.finalOutput || '',
        };
      } else {
        return classificationAgentResult;
      }

      return {
        success: true,
        classification: classificationAgentResult.output_parsed.classification,
        response: agentResult.output_text,
      };
    }

    return {
      success: false,
      message: isphonenumberauserResult.output_parsed.message || 'User not found or inactive',
    };
  });
};

module.exports = {
  runWorkflow,
};
