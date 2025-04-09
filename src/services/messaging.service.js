// src/services/twilioService.js
const Twilio = require('twilio');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
// const { Garantia } = require('../models');
const { CheckPhoneNumber } = require('../models');
const { User } = require('../models');
const { Whats } = require('../models');
const { agent } = require('supertest');

const messagingClient = new Twilio(config.twilio.accountSid, config.twilio.authToken);

const confirmWhatsCode = async (code, garantiaId) => {
  const confirmPhoneNumberCode = await CheckPhoneNumber.confirmCode(code, garantiaId);

  if (!confirmPhoneNumberCode) {
    const countFails = await CheckPhoneNumber.findOne({ garantiaId });
    if (countFails === null) {
      throw new ApiError(httpStatus.NOT_FOUND, `Code doesn't match, please request a new one.`);
    } else if (countFails.confirmed === true) {
      throw new ApiError(httpStatus.ALREADY_REPORTED, `This code was already confirmed, please request a new one.`);
    } else if (countFails.count > 3) {
      await CheckPhoneNumber.deleteOne({ garantiaId });
      throw new ApiError(httpStatus.TOO_MANY_REQUESTS, `Code doesn't match, please request a new one.`);
    } else {
      throw new ApiError(httpStatus.PRECONDITION_REQUIRED, `Code doesn't match. ${countFails.count} failed attempts.`);
    }
  } else {
    await CheckPhoneNumber.findOneAndUpdate({ code, garantiaId }, { $set: { confirmed: true } }, { upsert: true });
  }

  return true;
};

const confirmWhatsCodeLogin = async (code, phoneNumber) => {
  const confirmPhoneNumberCode = await CheckPhoneNumber.confirmCodeLogin(code, phoneNumber);

  if (!confirmPhoneNumberCode) {
    const countFails = await CheckPhoneNumber.findOne({ phoneNumber });
    if (countFails === null) {
      throw new ApiError(httpStatus.NOT_FOUND, `Code doesn't match, please request a new one.`);
    } else if (countFails.confirmed === true) {
      throw new ApiError(httpStatus.ALREADY_REPORTED, `This code was already confirmed, please request a new one.`);
    } else if (countFails.count > 3) {
      await CheckPhoneNumber.deleteOne({ phoneNumber });
      throw new ApiError(httpStatus.TOO_MANY_REQUESTS, `Code doesn't match, please request a new one.`);
    } else {
      throw new ApiError(httpStatus.PRECONDITION_REQUIRED, `Code doesn't match. ${countFails.count} failed attempts.`);
    }
  } else {
    await CheckPhoneNumber.findOneAndUpdate({ code, phoneNumber }, { $set: { confirmed: true } }, { upsert: true });
  }
  const user = await User.findOne({ phoneNumber });

  return { user, phoneNumber, confirmed: true };
};

const sendMessage = async (phoneNumber, message) => {
  const toPhoneNumber = `whatsapp:${phoneNumber}`;

  const checkExists = await CheckPhoneNumber.checkExists({ phoneNumber });

  if (!checkExists) {
    await CheckPhoneNumber.create({
      code: message,
      phoneNumber,
      count: 0,
    });
  } else {
    await CheckPhoneNumber.updateOne(
      { phoneNumber },
      { $set: { code: message, confirmed: false, count: 0, phoneNumber } },
      { upsert: true }
    );
  }

  try {
    const response = await messagingClient.messages
      .create({
        body: message,
        from: config.twilio.phoneNumber,
        to: toPhoneNumber,
      })
      .then(() => {
        // console.log(mess);
      });
    return response;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Failed to send Message: ${error.message}`);
  }
  // return true;
};

// this function sends an authentication to the user's phone number
const sendMessageLogin = async (phoneNumber, message) => {
  const toPhoneNumber = `whatsapp:${phoneNumber}`;

  const checkExists = await CheckPhoneNumber.checkExists({ phoneNumber }); // is the number on the db already?

  if (!checkExists) {
    // if not, create a new entry
    await CheckPhoneNumber.create({
      code: message,
      phoneNumber,
      count: 0,
    });
  } else {
    // if it is, update the entry with the new code
    await CheckPhoneNumber.updateOne(
      { phoneNumber },
      { $set: { code: message, confirmed: false, count: 0 } },
      { upsert: true }
    );
  }

  try {
    // send the code via whatsapp.
    // The message is a template that will be replaced by the code
    // The trick here is that we don't send a message, but a contentVariable with the code inside a template {{1:code}}
    // t still needs to receive the body of the message, but it will be replaced by the code
    const response = await messagingClient.messages
      .create({
        body: `{{${message}}}`,
        from: config.twilio.phoneNumber,
        contentSid: config.WA.authenticationId,
        to: toPhoneNumber,
        contentVariables: JSON.stringify({
          1: message,
        }),
      })
      .then(() => {});
    return response;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Failed to send Message: ${error.message}`);
  }
  // return true;
};

const replyMessage = async (phoneNumber, message) => {
  const toPhoneNumber = `${phoneNumber}`;

  try {
    const response = await messagingClient.messages
      .create({
        body: message,
        from: config.twilio.phoneNumber,
        to: toPhoneNumber,
      })
      .then(() => {
        // console.log(mess);
      });
    return response;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Failed to send Message: ${error.message}`);
  }
  return true;
};

const whatsIncoming = async (req, res) => {
  // Step 1: Validate incoming request and check if it is an existing thread
  let thread = await Whats.findOne({ phoneNumber: req.body.WaId });
  let message = req.body.Body;

  // Step 2: create a new thread if it doesn't exist
  if (!thread) {
    thread = await getThread().then((resp) => {
                      Whats.create({
                        phoneNumber: req.body.WaId,
                        threadId: resp,
                      });
                      
    });    
  }
  
  let assistantRun = "";
  // Step 3: Add message to thread
  await addMessagetoThread(message, thread.threadId).then((resp) => {
    
  });

  // Step 4: Run the assistant
  await runAssistant(message, thread.threadId).then((resp) => {
    assistantRun = resp;
  }).catch((err) => {
    console.log(err);
    return { message: err.message };
  });

  

  // Step 5: Poll for run completion
  let runStatus;
  let delayTime = 0;
  const maxDuration = 9;
  do {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
    delayTime++;
    runStatus = await retrieveStatus(assistantRun, thread.threadId).then((status) => {
      console.log({caca: status});
      return status;
    }).catch((err) => {
      console.log(err);
      thread.updateOne({ runStatus: err.message, requestDelay: delayTime });
      return { message: err.message };
    });
    
  } while (runStatus !== 'completed' && delayTime < maxDuration);
  
  await thread.updateOne({ runStatus: runStatus, requestDelay: delayTime, runId: assistantRun, status: 'active' });
  
  // Check if the run was successful
  if (runStatus !== 'completed') {
    console.log('Run failed or timed out');
    const agentReply = "Deme un minuto, voy a consultar.";
    const replyMess = await replyMessage(req.body.From, agentReply).then((resp) => {
      return resp;
    }).catch((err) => {
      console.log(err);
      return { message: err.message };
    });
    await thread.updateOne({ status: 'incomplete'  });
    return { agentReply, replyMess, delayTime };
  }

  // Step 6: Retrieve messages from the thread
  let agentReply= "";
  await retrieveMessages(thread.threadId).then((resp) => {
    agentReply = resp.data.find(msg => msg.role === 'assistant')?.content[0].text.value;
  });

  // Step 7: Send the reply back to the user
  const replyMess = await replyMessage(req.body.From, agentReply).then((resp) => {
    return resp;
  }).catch((err) => {
    console.log(err);
    return { message: err.message };
  });
  // Step 8: Update the thread with the response
  await thread.updateOne({ lastReply: agentReply, status: 'ok' });
  // Step 9: Return the response

  return { agentReply, replyMess, delayTime };
  
  
  /*const whats = await Whats.create( req.body );
  // console.log({key: config.openAI.key});
  const resp = await getChat(whats.Body);
  await whats.update({resp});
  const reply = await replyMessage(whats.From, resp);
  return {resp, reply};*/
};

const getAssistant = async (prompt) => {
  const apiKey =  config.openAI.key; // to-do list... get the OpenAI API key
  const assistantkey =  config.openAI.assistantKey; // to-do list... get the OpenAI API key
  const apiUrl = `https://api.openai.com/v1/assistants/${assistantkey}`;

  try {
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "OpenAI-Beta": "assistants=v2"
        }
    });
    const data = await response.json();
    return data;
  } catch (error) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Failed to fetch Assistant: ${error.message}`);
  }

};

const getThread = async () => {
  const apiKey =  config.openAI.key; // to-do list... get the OpenAI API key
  const assistantkey =  config.openAI.assistantKey; // to-do list... get the OpenAI API key
  const apiUrl = "https://api.openai.com/v1/threads";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "assistants=v2",
    }
  });
  
  const data = await response.json();
  return data.id;
};

const addMessagetoThread = async (message, thread_id) => {
  const apiKey =  config.openAI.key; // to-do list... get the OpenAI API key
  const assistantkey =  config.openAI.assistantKey; // to-do list... get the OpenAI API key
  const apiUrl = `https://api.openai.com/v1/threads/${thread_id}/messages`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "assistants=v2",
    },
    body: JSON.stringify({
        role: 'user', content: message,
    }),
  });

  return response;
};

const runAssistant = async (message, thread_id) => {
  const apiKey =  config.openAI.key; // to-do list... get the OpenAI API key
  const assistantkey =  config.openAI.assistantKey; // to-do list... get the OpenAI API key
  const apiUrl = `https://api.openai.com/v1/threads/${thread_id}/runs`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "assistants=v2",
    },
    body: JSON.stringify({
      "assistant_id": assistantkey,
    }),


  });

  const data = await response.json();
  return data.id;
}

const retrieveStatus = async (run_id, thread_id) => {
  const apiKey =  config.openAI.key; // to-do list... get the OpenAI API key
  const assistantkey =  config.openAI.assistantKey; // to-do list... get the OpenAI API key
  const apiUrl = `https://api.openai.com/v1/threads/${thread_id}/runs/${run_id}`;

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "assistants=v2",
    },
  });

  const data = await response.json();
  return data.status;
}

const retrieveMessages = async (thread_id) => {
  const apiKey =  config.openAI.key; // to-do list... get the OpenAI API key
  const assistantkey =  config.openAI.assistantKey; // to-do list... get the OpenAI API key
  const apiUrl = `https://api.openai.com/v1/threads/${thread_id}/messages`;

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "assistants=v2",
    },
  });

  const data = await response.json();
  return data;
}

const getChat = async (prompt) => {
  const apiKey =  config.openAI.key; // to-do list... get the OpenAI API key
  const apiUrl = "https://api.openai.com/v1/chat/completions";

  const response = await fetch(apiUrl, {
  method: "POST",
  headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: 'user', temperature: 0.9, content: prompt + ". Responda de forma corta y puntual, demostrando que sabe del asunto."}],
  }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

const runPendingThread = async (thread, runId, threadId) => {
  // Step 5: Poll for run completion
  let runStatus;
  let delayTime = 0;
  const maxDuration = 9;
  do {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
    delayTime++;
    runStatus = await retrieveStatus(runId, threadId).then((status) => {
      return status;
    }).catch((err) => {
      console.log(err);
      return { message: err.message };
    });
    
  } while (runStatus !== 'completed' && delayTime < maxDuration);
  
  await thread.updateOne({ runStatus: runStatus, requestDelay: delayTime, runId: runId, status: 'active' });
  
  // Check if the run was successful
  if (runStatus !== 'completed') {
    console.log('Run failed or timed out');
    const agentReply = "Esto no és muy común, voy a pedir ayuda a mi superior.";
    const replyMess = await replyMessage(`whatsapp:+${thread.phoneNumber}`, agentReply).then((resp) => {
      return resp;
    }).catch((err) => {
      console.log(err);
      return { message: err.message };
    });
    await thread.updateOne({ status: 'incomplete'  });
    return { agentReply, replyMess, delayTime };
  }

  // Step 6: Retrieve messages from the thread
  let agentReply= "";
  await retrieveMessages(thread.threadId).then((resp) => {
    agentReply = resp.data.find(msg => msg.role === 'assistant')?.content[0].text.value;
  });

  // Step 7: Send the reply back to the user
  const replyMess = await replyMessage(`whatsapp:+${thread.phoneNumber}`, agentReply).then((resp) => {
    return resp;
  }).catch((err) => {
    console.log(err);
    return { message: err.message };
  });
  // Step 8: Update the thread with the response
  await thread.updateOne({ lastReply: agentReply, status: 'ok' });
  // Step 9: Return the response

  return { agentReply, replyMess, delayTime };
};


const refreshWhatsQueue = async (req, res) => {
  // Check if there are any pending messages on the Whats queue
  const pendingThread = await Whats.findOne({ runStatus: 'in_progress', status: 'incomplete' });

  if (!pendingThread) {
    console.log(pendingThread);
    return { message: "No pending threads" };
  } else {
    runPendingThread(pendingThread, pendingThread.runId, pendingThread.threadId).then((resp) => {
      return resp;
    }
    ).catch((err) => {
      console.log(err);
      return { message: err.message };
    });
    return { message: "Pending threads found" };
  }
  
}

const maxDuration = 60; // Set to 60 seconds

module.exports = {
  sendMessage,
  confirmWhatsCode,
  sendMessageLogin,
  confirmWhatsCodeLogin,
  whatsIncoming,
  getAssistant,
  getThread,
  addMessagetoThread,
  runAssistant,
  retrieveStatus,
  retrieveMessages,
  refreshWhatsQueue,
  runPendingThread,
  maxDuration,
};
