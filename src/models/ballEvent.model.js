import mongoose from "mongoose";

const ballEventSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  over: {
    number: {
      type: Number,
      required: true
    },
    ball: {
      type: Number,
      required: true
    }
  },
  batsmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  bowlerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  runs: {
    scored: {
      type: Number,
      required: true
    },
    extras: {
      type: {
        type: String,
        enum: ['none', 'wide', 'no-ball'],
        default: 'none'
      },
      runs: {
        type: Number,
        default: 0
      }
    }
  },
  event: {
    type: {
      type: String,
      enum: ['boundary', 'wicket', 'normal', 'wide', 'no-ball'],
      required: true
    },
    boundary: {
      type: {
        type: String,
        enum: ['none', 'four', 'six'],
        default: 'none'
      }
    },
    wicket: {
      type: {
        type: String,
        enum: ['none', 'bowled', 'caught', 'LBW'],
        default: 'none'
      },
      details: {
        catchBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Player'
        }
      }
    }
  },
  isOut: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const BallEvent = mongoose.model('BallEvent', ballEventSchema);

export default BallEvent;
