/* eslint-disable import/no-extraneous-dependencies */
const { userCommService } = require('./index');
const logger = require('../config/logger');

// Model configuration with environment variable support
// Trim model names to remove any trailing comments or whitespace from .env files
const mainModel = (process.env.OPENAI_PRIMARY_MODEL || 'gpt-4o-mini').trim().split(/\s+#/)[0].trim();
const fallbackModel = (process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o').trim().split(/\s+#/)[0].trim();
const useFallback = process.env.OPENAI_USE_FALLBACK !== 'false'; // Default to true

// Dynamically load OpenAI packages with error handling
let agents;
let z;
try {
  /* eslint-disable global-require */
  agents = require('@openai/agents');
  z = require('zod');
  /* eslint-enable global-require */
} catch (error) {
  logger.error('@openai/agents or zod package not available:', error.message);
  throw new Error(
    'Required packages (@openai/agents, zod) are not installed. Please install them: npm install @openai/agents zod'
  );
}

// Validate API key
if (!process.env.OPENAI_API_KEY) {
  logger.warn('OPENAI_API_KEY is not set. WhatsApp agent service may not work properly.');
}

// Extract required functions from agents package
const { tool, Agent, Runner, withTrace } = agents;

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

      const result = await userCommService.addItemsToList(input.list_id, cleanPhoneNumber, input.items);

      logger.info('addItemsToList tool succeeded', {
        listId: result.list._id.toString(),
        listName: result.list.name,
        itemsAdded: result.itemsAdded,
        itemsSkipped: result.itemsSkipped,
        totalItemsInList: result.list.items.length,
      });

      return {
        success: true,
        message: result.message || `Added ${result.itemsAdded} item(s) to the list`,
        data: {
          listId: result.list._id.toString(),
          listName: result.list.name,
          itemsAdded: result.itemsAdded,
          itemsSkipped: result.itemsSkipped || 0,
          duplicateItems: result.duplicateItems,
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

/**
 * Run an agent with fallback support
 * Tries the primary agent first, falls back to fallback agent on error or quality issues
 * @param {Runner} runner - The agent runner instance
 * @param {Agent} primaryAgent - Primary (cost-effective) agent
 * @param {Agent} fallbackAgent - Fallback (more powerful) agent
 * @param {Array} conversationHistory - Conversation history
 * @param {Object} context - Context for the agent
 * @param {Function} qualityCheck - Optional function to check result quality
 * @returns {Promise<Object>} Agent result
 */
async function runAgentWithFallback(runner, primaryAgent, fallbackAgent, conversationHistory, context, qualityCheck = null) {
  if (!useFallback || !fallbackAgent) {
    // If fallback is disabled or no fallback agent provided, just use primary
    return runner.run(primaryAgent, [...conversationHistory], { context });
  }

  try {
    const result = await runner.run(primaryAgent, [...conversationHistory], { context });

    // If quality check is provided, validate the result
    if (qualityCheck && !qualityCheck(result)) {
      logger.warn('Primary agent result did not meet quality criteria, falling back', {
        agentName: primaryAgent.name,
      });
      return runner.run(fallbackAgent, [...conversationHistory], { context });
    }

    return result;
  } catch (error) {
    logger.warn('Primary agent failed, falling back to more powerful model', {
      agentName: primaryAgent.name,
      error: error.message,
    });
    // Fallback to more powerful model on error
    return runner.run(fallbackAgent, [...conversationHistory], { context });
  }
}

// Schema definitions
const ClassificationAgentSchema = z.object({
  classifications: z.array(z.enum(['add_to_list', 'remove_from_list', 'show_list'])).min(1),
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
  return `Analyze the user's message "${workflowInputAsText}" and identify ALL intents present. Return an array of classifications.

A user's message may contain multiple requests. For example:
- "include milk and remove bread" contains BOTH "add_to_list" (for milk) AND "remove_from_list" (for bread)
- "add eggs and show my list" contains BOTH "add_to_list" (for eggs) AND "show_list"

Classification categories:
1. "add_to_list" - Any request to add an item to a list (e.g., "add", "include", "put in")
2. "remove_from_list" - Any request to remove an item from a list (e.g., "remove", "delete", "take out")
3. "show_list" - Any request to view/see/display the list

Return an array with all applicable classifications. If the message contains multiple different actions, include all of them in the array.`;
};

const classificationAgent = new Agent({
  name: 'Classification Agent',
  instructions: classificationAgentInstructions,
  model: mainModel,
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
  model: mainModel,
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
  // console.log(userContext, userContext.lists, userContext.lists);
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
  model: mainModel,
  tools: [getUserInfoByPhone, addItemsToList],
  modelSettings: {
    temperature: 0.7,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
});

// Fallback agent for adding items (more powerful model)
const additem2listFallback = useFallback
  ? new Agent({
      name: 'addItem2ListFallback',
      instructions: additem2listInstructions,
      model: fallbackModel,
      tools: [getUserInfoByPhone, addItemsToList],
      modelSettings: {
        temperature: 0.7,
        topP: 1,
        maxTokens: 2048,
        store: true,
      },
    })
  : null;

// Agent for removing items from list
const removeItemAgent = new Agent({
  name: 'removeItemAgent',
  instructions: `You are an assistant that helps users remove items from their shopping lists.
When a user wants to remove items, you should:
1. Identify which list they want to remove from (use default list if not specified)
2. Extract the items they want to remove
3. Use the removeItemsFromList tool with the list_id, phone_number, and items array
4. Respond with a friendly confirmation message`,
  model: mainModel,
  tools: [getUserInfoByPhone, removeItemsFromList],
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
});

// Fallback agent for removing items (more powerful model)
const removeItemAgentFallback = useFallback
  ? new Agent({
      name: 'removeItemAgentFallback',
      instructions: `You are an assistant that helps users remove items from their shopping lists.
When a user wants to remove items, you should:
1. Identify which list they want to remove from (use default list if not specified)
2. Extract the items they want to remove
3. Use the removeItemsFromList tool with the list_id, phone_number, and items array
4. Respond with a friendly confirmation message`,
      model: fallbackModel,
      tools: [getUserInfoByPhone, removeItemsFromList],
      modelSettings: {
        temperature: 1,
        topP: 1,
        maxTokens: 2048,
        store: true,
      },
    })
  : null;

// Agent for showing list
const showListAgent = new Agent({
  name: 'showListAgent',
  instructions: `You are an assistant that helps users view their shopping lists.
When a user wants to see a list, you should:
1. Identify which list they want to see (use default list if not specified)
2. Use the getListById tool with the list_id and phone_number
3. Format the list items in a readable way
4. Respond with a friendly message showing the list`,
  model: mainModel,
  tools: [getUserInfoByPhone, getListById],
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
});

// Fallback agent for showing list (more powerful model)
const showListAgentFallback = useFallback
  ? new Agent({
      name: 'showListAgentFallback',
      instructions: `You are an assistant that helps users view their shopping lists.
When a user wants to see a list, you should:
1. Identify which list they want to see (use default list if not specified)
2. Use the getListById tool with the list_id and phone_number
3. Format the list items in a readable way
4. Respond with a friendly message showing the list`,
      model: fallbackModel,
      tools: [getUserInfoByPhone, getListById],
      modelSettings: {
        temperature: 1,
        topP: 1,
        maxTokens: 2048,
        store: true,
      },
    })
  : null;

/**
 * Execute a single agent based on classification
 * @param {Runner} runner - The agent runner instance
 * @param {string} classification - The classification type
 * @param {Array} conversationHistory - Current conversation history
 * @param {Object} userContextData - User context data
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<Object>} Result with output_text and updated conversation history
 */
async function executeAgentByClassification(runner, classification, conversationHistory, userContextData, phoneNumber) {
  const context = {
    phoneNumber,
    userContext: userContextData,
  };

  if (classification === 'add_to_list') {
    logger.info('Running addItem2List agent', {
      phoneNumber,
      hasUserContext: !!userContextData,
    });

    const additem2listResultTemp = await runAgentWithFallback(
      runner,
      additem2list,
      additem2listFallback,
      [...conversationHistory],
      { context },
      (result) => {
        const newItems = result.newItems || [];
        const toolCalls = newItems.filter(
          (item) =>
            (item.rawItem && item.rawItem.role === 'tool') ||
            (item.rawItem && item.rawItem.content && item.rawItem.content.some((c) => c.type === 'tool_call'))
        );
        return result.finalOutput || toolCalls.length > 0;
      }
    );

    const newItems = additem2listResultTemp.newItems || [];
    const toolCalls = newItems.filter(
      (item) =>
        (item.rawItem && item.rawItem.role === 'tool') ||
        (item.rawItem && item.rawItem.content && item.rawItem.content.some((c) => c.type === 'tool_call'))
    );

    logger.info('addItem2List agent completed', {
      hasFinalOutput: !!additem2listResultTemp.finalOutput,
      toolCallsCount: toolCalls.length,
    });

    const updatedHistory = [...conversationHistory, ...additem2listResultTemp.newItems.map((item) => item.rawItem)];

    if (!additem2listResultTemp.finalOutput) {
      if (toolCalls && toolCalls.length > 0) {
        return {
          output_text: "I've added the items to your list!",
          conversationHistory: updatedHistory,
        };
      }
      throw new Error('Agent result is undefined and no tools were called');
    }

    return {
      output_text: additem2listResultTemp.finalOutput || '',
      conversationHistory: updatedHistory,
    };
  }
  if (classification === 'remove_from_list') {
    logger.info('Running removeItemAgent', {
      phoneNumber,
      hasUserContext: !!userContextData,
    });

    const removeItemResultTemp = await runAgentWithFallback(
      runner,
      removeItemAgent,
      removeItemAgentFallback,
      [...conversationHistory],
      { context }
    );

    const updatedHistory = [...conversationHistory, ...removeItemResultTemp.newItems.map((item) => item.rawItem)];

    if (!removeItemResultTemp.finalOutput) {
      throw new Error('Agent result is undefined');
    }

    return {
      output_text: removeItemResultTemp.finalOutput || '',
      conversationHistory: updatedHistory,
    };
  }
  if (classification === 'show_list') {
    logger.info('Running showListAgent', {
      phoneNumber,
      hasUserContext: !!userContextData,
    });

    const showListResultTemp = await runAgentWithFallback(
      runner,
      showListAgent,
      showListAgentFallback,
      [...conversationHistory],
      { context }
    );

    const updatedHistory = [...conversationHistory, ...showListResultTemp.newItems.map((item) => item.rawItem)];

    if (!showListResultTemp.finalOutput) {
      throw new Error('Agent result is undefined');
    }

    return {
      output_text: showListResultTemp.finalOutput || '',
      conversationHistory: updatedHistory,
    };
  }

  throw new Error(`Unknown classification: ${classification}`);
}

/**
 * Main workflow function
 * @param {Object} workflow - Workflow input
 * @param {string} workflow.input_as_text - The user's message text
 * @param {string} workflow.phone_number - The user's phone number
 * @returns {Promise<Object>} Workflow result
 */
const runWorkflow = async (workflow) => {
  // Validate API key is set (packages are already validated at module load)
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Please configure the OpenAI API key in your environment variables.');
  }

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
      // Get user context data
      const userContextData = isphonenumberauserResult.output_parsed.data;

      // Classify the intent using the classification agent
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

      // Get classifications array (handle both old single classification and new array format)
      const classifications =
        classificationAgentResult.output_parsed.classifications ||
        (classificationAgentResult.output_parsed.classification
          ? [classificationAgentResult.output_parsed.classification]
          : []);

      if (classifications.length === 0) {
        logger.warn('No classifications found in result', {
          output_parsed: classificationAgentResult.output_parsed,
        });
        return classificationAgentResult;
      }

      logger.info('Processing multiple classifications', {
        phoneNumber: state.phone_number,
        classifications,
        count: classifications.length,
      });

      // Execute each classification sequentially
      const responses = [];
      let currentConversationHistory = [...conversationHistory];

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < classifications.length; i += 1) {
        const classification = classifications[i];
        logger.info(`Executing classification ${i + 1}/${classifications.length}`, {
          classification,
          phoneNumber: state.phone_number,
        });

        try {
          // eslint-disable-next-line no-await-in-loop
          const agentResult = await executeAgentByClassification(
            runner,
            classification,
            currentConversationHistory,
            userContextData,
            state.phone_number
          );

          responses.push(agentResult.output_text);
          currentConversationHistory = agentResult.conversationHistory;
        } catch (error) {
          logger.error(`Error executing classification ${classification}:`, error);
          // Continue with other classifications even if one fails
          responses.push(`I encountered an error processing the ${classification} request.`);
        }
      }

      // Combine all responses into a single message
      // If there's only one response, use it as-is. Otherwise, combine them.
      const combinedResponse = responses.length === 1 ? responses[0] : responses.filter((r) => r && r.trim()).join('\n\n');

      return {
        success: true,
        classifications,
        response: combinedResponse,
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
