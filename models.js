// models.js
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  loggedin: { type: String, default: "admin" },
});
const coachSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  loggedin: { type: String, default: "coach" },
});
const coordinatorSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  loggedin: { type: String, default: "coordinator" },
  department: { type: String, unique: true }, // Ensure one coordinator per department
});

const refSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  loggedin: { type: String, default: "ref" },
  sportscategory: { type: String, unique: true }, // Ensure one ref per category
});
const repSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  loggedin: { type: String, default: "rep" },
  department: { type: String, unique: true }, // Ensure one rep per department
});

const admingpostSchema = new mongoose.Schema({
    adminpostdescription :String,
    adminimagepost: String,
    adminpostuserId: {type: mongoose.Schema.Types.ObjectId,ref: 'DSAUser'},
    adminpostusername: String,
    adminpostemail: String,
    postedAt: {type: Date,default: Date.now},
  });
  // Sports Rules Schema
const sportsRulesSchema = new mongoose.Schema({
    sport: { type: String, unique: true, required: true },
    rules: { type: String, required: true },
    lastUpdatedBy: { type: String, required: true }, // Email or username of the last updater
    updatedAt: { type: Date, default: Date.now },
});

const playerNominationSchema = new mongoose.Schema({
  sport: { type: String, required: true },
  department: { type: String, required: true },
  nominations: [
    {
      name: { type: String, required: true },
      cnic: { type: String, required: true },
      section: { type: String, required: true },
    }
  ],
  repId: { type: String, required: true },
  repName: { type: String, required: true },
  repEmail: { type: String, required: true },
  repDepartment: { type: String, required: true },
  lastUpdatedBy: { type: String, required: true },
  lastUpdatedAt: { type: Date, default: Date.now },
});

const trialEventSchema = new mongoose.Schema({
  sportCategory: { type: String, required: true },
  date: { type: String, required: true }, // Day (e.g., 'Monday')
  time: { type: String, required: true }, // Time in AM/PM format
  hour: { type: Number, required: true }, // Hour (1-12)
  minute: { type: Number, required: true }, // Minute (0-59)
  repId: { type: mongoose.Schema.Types.ObjectId, ref: 'RepUser', required: true },
  repName: { type: String, required: true },
  department: { type: String, required: true },
  isConfirmed: { type: Boolean, default: false }, // Green tick
  createdAt: { type: Date, default: Date.now },
});

const captainSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Captain's name
  email: { type: String, unique: true, required: true }, // Captain's email
  password: { type: String, required: true }, // Hashed password
  loggedin: { type: String, default: "captain" },
  category: { type: String, required: true }, // Sports category (e.g., Volleyball, Football)
  department: { type: String, required: true }, // Department of the captain
  repId: { type: mongoose.Schema.Types.ObjectId, ref: 'RepUser', required: true }, // Ref to the representative who created the captain
  repEmail: { type: String, required: true }, // Email of the representative
  repName: { type: String, required: true }, // Name of the representative
  createdAt: { type: Date, default: Date.now }, // Timestamp of captain creation
});

const rankingSchema = new mongoose.Schema({
  category: String,
  year: String,
  P1: String,
  P2: String,
  P3: String,
  P4: String,
  P5: String,
  P6: String,
  P7: String,
  P8: String,
});

const poolsSchema = new mongoose.Schema({
  sport: { type: String, required: true },
  poolA: [String], // Teams in Pool A
  poolB: [String], // Teams in Pool B
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true }, // Username of the creator
  year: { type: String, required: true }, // Year of pool creation
});


// const schedulesSchema = new mongoose.Schema({
//   pool: { type: String, required: true }, // Pool A or Pool B
//   team1: { type: String, required: true },
//   team2: { type: String, required: true },
//   sport: { type: String, required: true },
//   createdAt: { type: Date, default: Date.now },
//   scoreT1: { type: Number, default: 0 }, // Score for Team 1
//   scoreT2: { type: Number, default: 0 }, // Score for Team 2
//   result: { type: String, default: null }, // Result of the match (null by default)
//   status: { type: String, default: 'upcoming' }, // Status of the match (upcoming by default)
//   // T1wickets: { type: Number, default: 0 }, // Wickets for Team 1 (for cricket)
//   // T2wickets: { type: Number, default: 0 }, // Wickets for Team 2 (for cricket)
//   rounds: { type: Number, default: 0 },
//   year: { type: String, required: true }, // Year of the match
// });

const getScheduleSchema = (sport) => {
  const baseSchema = {
    pool: { type: String, required: true },
    team1: { type: String, required: true },
    team2: { type: String, required: true },
    sport: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    result: { type: String, default: null },
    status: { type: String, default: "upcoming" },
    year: { type: String, required: true },
  };

  if (sport === "Football") {
    return new mongoose.Schema({
      ...baseSchema,
      half: { type:Number, default:0},
      scoreT1: { type: Number, default: 0 },
      scoreT2: { type: Number, default: 0 },
      nominationsT1: [
        {
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          goalsscored: { type: String, default: 0},
          
        }
      ],
      nominationsT2: [
        {
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          goalsscored: { type: String, default: 0},
          
        }
      ],
    });
  } else if (sport === "Cricket") {
    return new mongoose.Schema({
      ...baseSchema,
      scoreT1: { type: Number, default: 0 },
      scoreT2: { type: Number, default: 0 },
      T1wickets: { type: Number, default: 0 },
      T2wickets: { type: Number, default: 0 },
      overs: { type: Number, default: 0 },
    });
  } else if (sport === "Tennis") {
    return new mongoose.Schema({
      ...baseSchema,
      setsT1: { type: Number, default: 0 },
      setsT2: { type: Number, default: 0 },
    });
  } else if (sport === "Futsal") {
    return new mongoose.Schema({
      ...baseSchema,
      scoreT1: { type: Number, default: 0 },
      scoreT2: { type: Number, default: 0 },
      duration: { type: Number, default: 40 }, // Default 40 minutes
    });
  }

  return new mongoose.Schema(baseSchema);
};



const DSAUser = mongoose.model('DSAUser', adminSchema);
const SportsCoachUser = mongoose.model('SportsCoachUser', coachSchema);
const CoordinatorUser = mongoose.model('CoordinatorUser', coordinatorSchema);
const RepUser = mongoose.model('RepUser', repSchema);
const RefUser = mongoose.model('RefUser', refSchema);
const CaptainUser = mongoose.model('CaptainUser', captainSchema);
const AdminPost = mongoose.model('AdminPost', admingpostSchema);
const SportsRules = mongoose.model('SportsRules', sportsRulesSchema);
const PlayerNominationForm = mongoose.model('PlayerNominationForm', playerNominationSchema);
const TrialEvent = mongoose.model('TrialEvent', trialEventSchema);
const TeamRankings = mongoose.model('TeamRankings', rankingSchema);
const Pools = mongoose.model("Pools", poolsSchema);
// const Schedules = mongoose.model("Schedules", schedulesSchema);
// Function to create the correct model dynamically

const createScheduleModel = (sport) => {
  const modelName = `${sport}Schedules`.replace(/\s+/g, ""); // Remove spaces

  if (mongoose.models[modelName]) {
    return mongoose.models[modelName]; // Return existing model if already created
  }

  const scheduleSchema = getScheduleSchema(sport); // Use correct schema
  return mongoose.model(modelName, scheduleSchema);
};

module.exports = { DSAUser, SportsCoachUser, CoordinatorUser, RepUser, AdminPost, SportsRules, PlayerNominationForm, TrialEvent, CaptainUser, TeamRankings, Pools, createScheduleModel, RefUser };
// Schedules (to be added in module.exports)