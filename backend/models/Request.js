const mongoose = require('mongoose');

const VALID_REQUEST_TYPES = [
  'Bonafide Certificate',
  'Transcript',
  'ID Card',
  'Fee Receipt',
];

const VALID_STATUSES = [
  'Submitted',
  'In Progress',
  'Approved',
  'Rejected',
  'Ready for Collection',
  'Completed',
];

const requestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    studentEmail: {
      type: String,
      required: true,
    },
    studentRollNo: {
      type: String,
      default: '',
    },
    requestType: {
      type: String,
      required: [true, 'Request type is required'],
      enum: {
        values: VALID_REQUEST_TYPES,
        message: '{VALUE} is not a valid request type',
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: VALID_STATUSES,
        message: '{VALUE} is not a valid status',
      },
      default: 'Submitted',
      index: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    lastUpdatedBy: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Request = mongoose.model('Request', requestSchema);

module.exports = {
  Request,
  VALID_REQUEST_TYPES,
  VALID_STATUSES,
};
