const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { sendMessage, confirmWhatsCode } = require('../services/messaging.service');
const { createCheck } = require('../services/checkPhoneNumber.service');
const CodeGenerator = require('../utils/generator');

const sendCodeWhatsApp = catchAsync(async (req, res) => {
  const oCode = new CodeGenerator(5, 'number');
  const response = await sendMessage(req.body.phoneNumber, oCode.code, req.body.garantiaId).then((message) => {
    // res.status(httpStatus.CREATED).send(aGarantias.collection);
    console.log(message);
    res.status(httpStatus.CREATED).send({ response: message });
  });
});

const confirmCode = catchAsync(async (req, res) => {
  const response = await confirmWhatsCode(req.body.phoneNumber, req.body.code, req.body.garantiaId );
  (response) ? res.status(httpStatus.ACCEPTED).send({phoneNumber: req.body.phoneNumber, garantiaId: req.body.garantiaId, confirmation: true}) : res.send({ response: 'Code does not match', confirmation: false });
});

module.exports = {
  sendCodeWhatsApp,
  confirmCode,
};

/* example:
commClient.messages
  .create({
    body: 'Your appointment is coming up on July 21 at 3PM',
    from: process.env.ACCOUNTSID,
    to: process.env.FROMWHATS,
  })
  .then((message) => console.log(message.sid));

export default { commClient };
*/
