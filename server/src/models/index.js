// Purpose: Models index exporting all Mongoose data models
const User = require("./User");
const Asset = require("./Asset");
const License = require("./License");
const Ticket = require("./Ticket");
const AuditLog = require("./AuditLog");
const Counter = require("./Counter");

module.exports = {
  User,
  Asset,
  License,
  Ticket,
  AuditLog,
  Counter
};
