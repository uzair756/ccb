// models.js
const mongoose = require("mongoose");

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

// const admingpostSchema = new mongoose.Schema({
//   adminpostdescription: String,
//   adminimagepost: String,
//   adminpostuserId: { type: mongoose.Schema.Types.ObjectId, ref: "DSAUser" },
//   adminpostusername: String,
//   adminpostemail: String,
//   postedAt: { type: Date, default: Date.now },
// });
const adminpostSchema = new mongoose.Schema({
  adminpostdescription: String,
  adminimagepost: {
    data: Buffer,
    contentType: String
  },
  adminpostuserId: { type: mongoose.Schema.Types.ObjectId, ref: "DSAUser" },
  adminpostusername: String,
  adminpostemail: String,
  postedAt: { type: Date, default: Date.now },
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
  year: { type: String, required: true },
  
  nominations: [
    {
      shirtNo: { type: String, required: true },
      regNo: { type: String, required: true },
      name: { type: String, required: true },
      cnic: { type: String, required: true },
      section: { type: String, required: true },
    },
  ],
  repId: { type: String, required: true },
  repName: { type: String, required: true },
  repEmail: { type: String, required: true },
  repDepartment: { type: String, required: true },
  lastUpdatedBy: { type: String, required: true },
  lastUpdatedAt: { type: Date, default: Date.now },
});

const bestCricketerSchema = new mongoose.Schema({
  year: { type: String, required: true },
  nominations: [
    {
      shirtNo: { type: String, required: true },
      regNo: { type: String, required: true },
      name: { type: String, required: true },
      cnic: { type: String, required: true },
      section: { type: String, required: true },
      totalrunsScored: { type: Number, default: 0 }, // Total runs scored
      totalballsfaced: { type: Number, default: 0 }, // Total runs scored
      totalwicketstaken: { type: Number, default: 0 }, // Total runs scored
      totalrunsconceeded: { type: Number, default: 0 }, // Total runs scored
      matchesPlayed: { type: Number, default: 0 } // New field
    },
  ],
});
const bestFootballPlayerSchema = new mongoose.Schema({
  year: { type: String, required: true },
  nominations: [
    {
      shirtNo: { type: String, required: true },
      regNo: { type: String, required: true },
      name: { type: String, required: true },
      cnic: { type: String, required: true },
      section: { type: String, required: true },
      totalgoalsscored: { type: Number, default: 0 }, // Total goals scored
      matchesPlayed: { type: Number, default: 0 } // New field
    },
  ],
});
const bestFutsalPlayerSchema = new mongoose.Schema({
  year: { type: String, required: true },
  nominations: [
    {
      shirtNo: { type: String, required: true },
      regNo: { type: String, required: true },
      name: { type: String, required: true },
      cnic: { type: String, required: true },
      section: { type: String, required: true },
      totalgoalsscored: { type: Number, default: 0 }, // Total goals scored
      matchesPlayed: { type: Number, default: 0 } // New field
    },
  ],
});
const bestBasketballPlayerSchema = new mongoose.Schema({
  year: { type: String, required: true },
  nominations: [
    {
      shirtNo: { type: String, required: true },
      regNo: { type: String, required: true },
      name: { type: String, required: true },
      cnic: { type: String, required: true },
      section: { type: String, required: true },
      totalpointsscored: { type: Number, default: 0 }, // Total goals scored
      matchesPlayed: { type: Number, default: 0 } // New field
    },
  ],
});
const bestTennisPlayerSchema = new mongoose.Schema({
  year: { type: String, required: true },
  nominations: [
    {
      shirtNo: { type: String, required: true },
      regNo: { type: String, required: true },
      name: { type: String, required: true },
      cnic: { type: String, required: true },
      section: { type: String, required: true },
      totalpointsscored: { type: Number, default: 0 }, // Total goals scored
      matchesPlayed: { type: Number, default: 0 } // New field
    },
  ],
});

const bestSnookerPlayerSchema = new mongoose.Schema({
  year: { type: String, required: true },
  nominations: [
    {
      shirtNo: { type: String, required: true },
      regNo: { type: String, required: true },
      name: { type: String, required: true },
      cnic: { type: String, required: true },
      section: { type: String, required: true },
      totalpointsscored: { type: Number, default: 0 }, // Total goals scored
      matchesPlayed: { type: Number, default: 0 } // New field
    },
  ],
});

const bestBadmintonMalePlayerSchema = new mongoose.Schema({
  year: { type: String, required: true },
  nominations: [
    {
      shirtNo: { type: String, required: true },
      regNo: { type: String, required: true },
      name: { type: String, required: true },
      cnic: { type: String, required: true },
      section: { type: String, required: true },
      totalpointsscored: { type: Number, default: 0 }, // Total goals scored
      matchesPlayed: { type: Number, default: 0 } // New field
    },
  ],
});
const bestBadmintonFemalePlayerSchema = new mongoose.Schema({
  year: { type: String, required: true },
  nominations: [
    {
      shirtNo: { type: String, required: true },
      regNo: { type: String, required: true },
      name: { type: String, required: true },
      cnic: { type: String, required: true },
      section: { type: String, required: true },
      totalpointsscored: { type: Number, default: 0 }, // Total goals scored
      matchesPlayed: { type: Number, default: 0 } // New field
    },
  ],
});
const bestTableTennisMalePlayerSchema = new mongoose.Schema({
  year: { type: String, required: true },
  nominations: [
    {
      shirtNo: { type: String, required: true },
      regNo: { type: String, required: true },
      name: { type: String, required: true },
      cnic: { type: String, required: true },
      section: { type: String, required: true },
      totalpointsscored: { type: Number, default: 0 }, // Total goals scored
      matchesPlayed: { type: Number, default: 0 } // New field
    },
  ],
});
const bestTableTennisFemalePlayerSchema = new mongoose.Schema({
  year: { type: String, required: true },
  nominations: [
    {
      shirtNo: { type: String, required: true },
      regNo: { type: String, required: true },
      name: { type: String, required: true },
      cnic: { type: String, required: true },
      section: { type: String, required: true },
      totalpointsscored: { type: Number, default: 0 }, // Total goals scored
      matchesPlayed: { type: Number, default: 0 } // New field
    },
  ],
});



const trialEventSchema = new mongoose.Schema({
  sportCategory: { type: String, required: true },
  date: { type: String, required: true }, // Day (e.g., 'Monday')
  time: { type: String, required: true }, // Time in AM/PM format
  hour: { type: Number, required: true }, // Hour (1-12)
  minute: { type: Number, required: true }, // Minute (0-59)
  repId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RepUser",
    required: true,
  },
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
  repId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RepUser",
    required: true,
  }, // Ref to the representative who created the captain
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
  P9: String,
  P10: String,
  P11: String,
  P12: String,
  P13: String,
  P14: String,
  P15: String,
  P16: String,
});

const departmentSchema = new mongoose.Schema({
  teams: {
    type: [String],
    required: true,
    validate: {
      validator: function(teams) {
        // Validate each team is uppercase alphabets only
        return teams.every(team => /^[A-Z]+$/.test(team));
      },
      message: props => `${props.value} contains invalid team names. Only uppercase alphabets are allowed.`
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

departmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Ensure all team names are uppercase before saving
  if (this.teams && this.isModified('teams')) {
    this.teams = this.teams.map(team => team.toUpperCase());
  }
  
  next();
});

const poolsSchema = new mongoose.Schema({
  sport: { type: String, required: true },
  poolA: [String], // Teams in Pool A
  poolB: [String], // Teams in Pool B
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true }, // Username of the creator
  year: { type: String, required: true }, // Year of pool creation
});


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
    matchDate: { type: Date, default: null },
    matchTime: { type: String, default: null },
    venue: { type: String, default: null },
    updatedBy: { type: String, default: null },
    lastUpdated: { type: Date, default: null }
  };

  if (sport === "Football") {
    return new mongoose.Schema({
      ...baseSchema,
      half: { type: Number, default: 0 },
      scoreT1: { type: Number, default: 0 },
      scoreT2: { type: Number, default: 0 },
      nominationsT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          goalsscored: { type: Number, default: 0 },
        },
      ],
      nominationsT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          goalsscored: { type: Number, default: 0 },
        },
      ],
      penaltiesT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          penaltyscored: { type: Number, default: 0 },
        },
      ],
      penaltiesT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          penaltyscored: { type: Number, default: 0 },
        },
      ],
    });
  } else if (sport === "Cricket") {
    return new mongoose.Schema({
      ...baseSchema,
      tosswin: { type: String, default: null }, // Stores team name
      tosswindecision: { type: String, default: null }, // Bat or Bowl
      tossloose: { type: String, default: null }, // Stores team name
      tossloosedecision: { type: String, default: null }, // Bat or Bowl
      FirstInningBattingTeam: { type: String, default: null }, // Stores team name
      FirstInningBowlingTeam: { type: String, default: null }, // Bat or Bowl
      SecondInningBattingTeam: { type: String, default: null }, // Stores team name
      SecondInningBowlingTeam: { type: String, default: null }, // Bat or Bowl
      inning: { type: Number, default: 0 },
      scoreT1: { type: Number, default: 0 },
      scoreT2: { type: Number, default: 0 },
      T1wickets: { type: Number, default: 0 },
      T2wickets: { type: Number, default: 0 },
      // Separate Overs Tracking for Each Inning
      oversInning1: { type: Number, default: 0.0 },
      oversInning2: { type: Number, default: 0.0 },
      // Overall match runs breakdown per innings
      runsInning1: [{ type: String }], // Stores runs scored in 1st inning (each ball)
      runsInning2: [{ type: String }], // Stores runs scored in 2nd inning (each ball)
      nominationsT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: [
              "Playing",
              "Reserved",
              "ActiveBatsman",
              "ActiveBowler",
              "Out",
            ],
            default: "Reserved",
          },
          runsScored: { type: Number, default: 0 }, // Total runs scored
          ballsFaced: [{ type: Number }], // Runs per ball faced
          ballsBowled: [{ type: String }], // Runs conceded per ball bowled
          wicketsTaken: { type: Number, default: 0 }, // Total wickets taken
        },
      ],
      nominationsT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: [
              "Playing",
              "Reserved",
              "ActiveBatsman",
              "ActiveBowler",
              "Out",
            ],
            default: "Reserved",
          },
          runsScored: { type: Number, default: 0 },
          ballsFaced: [{ type: Number }],
          ballsBowled: [{ type: String }],
          wicketsTaken: { type: Number, default: 0 },
        },
      ],

      superOver: {
        firstInning: {
          battingTeam: String,
          bowlingTeam: String,
          runs: Number,
          wickets: Number,
          ballsBowled: Number,
          balls: [String], // Array to track each ball (runs, W, WD, NB, etc.)
          batsmen: [String], // Array of player IDs
          bowler: String, // Player ID
        },
        secondInning: {
          battingTeam: String,
          bowlingTeam: String,
          runs: Number,
          wickets: Number,
          ballsBowled: Number,
          balls: [String],
          batsmen: [String],
          bowler: String,
        },
        currentInning: Number, // 1 or 2
        winner: String, // Winning team name or "Match Tied"
        isComplete: Boolean,
      },
    });
  } else if (sport === "Basketball") {
    return new mongoose.Schema({
      ...baseSchema,
      quarter: { type: Number, default: 0 }, // Tracks the current quarter (1 to 4)
      quarterWinners: { type: [String], default: ["", "", "", ""] }, // Stores winning team per quarter ("T1", "T2", "Tie")
      scoreT1: { type: [Number], default: [0, 0, 0, 0] }, // Stores points for each quarter
      scoreT2: { type: [Number], default: [0, 0, 0, 0] }, // Stores points for each quarter
      nominationsT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0, 0] }, // Store per-quarter player score
        },
      ],
      nominationsT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0, 0] }, // Store per-quarter player score
        },
      ],
    });
  } else if (sport === "Snooker") {
    return new mongoose.Schema({
      ...baseSchema,
      quarter: { type: Number, default: 0 }, // Tracks the current quarter (1 to 4)
      quarterWinners: { type: [String], default: ["", "", "", ""] }, // Stores winning team per quarter ("T1", "T2", "Tie")
      scoreT1: { type: [Number], default: [0, 0, 0, 0] }, // Stores points for each quarter
      scoreT2: { type: [Number], default: [0, 0, 0, 0] }, // Stores points for each quarter
      nominationsT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0, 0] }, // Store per-quarter player score
        },
      ],
      nominationsT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0, 0] }, // Store per-quarter player score
        },
      ],
    });
  } else if (sport === "Volleyball") {
    return new mongoose.Schema({
      ...baseSchema,
      quarter: { type: Number, default: 0 }, // Tracks the current quarter (1 to 3)
      quarterWinners: { type: [String], default: ["", "", ""] }, // Stores winning team per quarter ("T1", "T2", "Tie")
      scoreT1: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      scoreT2: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      nominationsT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
      nominationsT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
    });
  } else if (sport === "Badminton (M)") {
    return new mongoose.Schema({
      ...baseSchema,
      quarter: { type: Number, default: 0 }, // Tracks the current quarter (1 to 3)
      quarterWinners: { type: [String], default: ["", "", ""] }, // Stores winning team per quarter ("T1", "T2", "Tie")
      scoreT1: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      scoreT2: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      nominationsT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
      nominationsT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
    });
  } else if (sport === "Badminton (F)") {
    return new mongoose.Schema({
      ...baseSchema,
      quarter: { type: Number, default: 0 }, // Tracks the current quarter (1 to 3)
      quarterWinners: { type: [String], default: ["", "", ""] }, // Stores winning team per quarter ("T1", "T2", "Tie")
      scoreT1: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      scoreT2: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      nominationsT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
      nominationsT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
    });
  } else if (sport === "Tug of War (M)") {
    return new mongoose.Schema({
      ...baseSchema,
      quarter: { type: Number, default: 0 }, // Tracks the current quarter (1 to 3)
      quarterWinners: { type: [String], default: ["", "", ""] }, // Stores winning team per quarter ("T1", "T2", "Tie")
      scoreT1: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      scoreT2: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      nominationsT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
      nominationsT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
    });
  } else if (sport === "Tug of War (F)") {
    return new mongoose.Schema({
      ...baseSchema,
      quarter: { type: Number, default: 0 }, // Tracks the current quarter (1 to 3)
      quarterWinners: { type: [String], default: ["", "", ""] }, // Stores winning team per quarter ("T1", "T2", "Tie")
      scoreT1: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      scoreT2: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      nominationsT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
      nominationsT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
    });
  } else if (sport === "Tennis") {
    return new mongoose.Schema({
      ...baseSchema,
      quarter: { type: Number, default: 0 }, // Tracks the current quarter (1 to 3)
      quarterWinners: { type: [String], default: ["", "", ""] }, // Stores winning team per quarter ("T1", "T2", "Tie")
      scoreT1: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      scoreT2: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      nominationsT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
      nominationsT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
    });
  } else if (sport === "Table Tennis (M)") {
    return new mongoose.Schema({
      ...baseSchema,
      quarter: { type: Number, default: 0 }, // Tracks the current quarter (1 to 3)
      quarterWinners: { type: [String], default: ["", "", ""] }, // Stores winning team per quarter ("T1", "T2", "Tie")
      scoreT1: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      scoreT2: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      nominationsT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
      nominationsT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
    });
  } else if (sport === "Table Tennis (F)") {
    return new mongoose.Schema({
      ...baseSchema,
      quarter: { type: Number, default: 0 }, // Tracks the current quarter (1 to 3)
      quarterWinners: { type: [String], default: ["", "", ""] }, // Stores winning team per quarter ("T1", "T2", "Tie")
      scoreT1: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      scoreT2: { type: [Number], default: [0, 0, 0] }, // Stores points for each quarter
      nominationsT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
      nominationsT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          pointsByQuarter: { type: [Number], default: [0, 0, 0] }, // Store per-quarter player score
        },
      ],
    });
  } else if (sport === "Futsal") {
    return new mongoose.Schema({
      ...baseSchema,
      half: { type: Number, default: 0 },
      scoreT1: { type: Number, default: 0 },
      scoreT2: { type: Number, default: 0 },
      nominationsT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          goalsscored: { type: Number, default: 0 },
        },
      ],
      nominationsT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          playingStatus: {
            type: String,
            enum: ["Playing", "Reserved"],
            default: "Reserved",
          },
          goalsscored: { type: Number, default: 0 },
        },
      ],
      penaltiesT1: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          penaltyscored: { type: Number, default: 0 },
        },
      ],
      penaltiesT2: [
        {
          shirtNo: { type: String, required: true },
          regNo: { type: String, required: true },
          name: { type: String, required: true },
          cnic: { type: String, required: true },
          section: { type: String, required: true },
          penaltyscored: { type: Number, default: 0 },
        },
      ],
    });
  }

  return new mongoose.Schema(baseSchema);
};

const DSAUser = mongoose.model("DSAUser", adminSchema);
const SportsCoachUser = mongoose.model("SportsCoachUser", coachSchema);
const CoordinatorUser = mongoose.model("CoordinatorUser", coordinatorSchema);
const RepUser = mongoose.model("RepUser", repSchema);
const RefUser = mongoose.model("RefUser", refSchema);
const CaptainUser = mongoose.model("CaptainUser", captainSchema);
const AdminPost = mongoose.model("AdminPost", adminpostSchema);
const SportsRules = mongoose.model("SportsRules", sportsRulesSchema);
const PlayerNominationForm = mongoose.model(
  "PlayerNominationForm",
  playerNominationSchema,
);
const TrialEvent = mongoose.model("TrialEvent", trialEventSchema);
const TeamRankings = mongoose.model("TeamRankings", rankingSchema);
const Pools = mongoose.model("Pools", poolsSchema);
const BestCricketer = mongoose.model("BestCricketer", bestCricketerSchema);
const BestFootballPlayer = mongoose.model("BestFootballPlayer", bestFootballPlayerSchema);
const BestFutsalPlayer = mongoose.model("BestFutsalPlayer", bestFutsalPlayerSchema);
const BestBasketballPlayer = mongoose.model("BestBasketballPlayer", bestBasketballPlayerSchema);
const BestTennisPlayer = mongoose.model("BestTennisPlayer", bestTennisPlayerSchema);
const BestSnookerPlayer = mongoose.model("BestSnookerPlayer", bestSnookerPlayerSchema);
const BestBadmintonMalePlayer = mongoose.model("BestBadmintonMalePlayer", bestBadmintonMalePlayerSchema);
const BestBadmintonFemalePlayer = mongoose.model("BestBadmintonFemalePlayer",bestBadmintonFemalePlayerSchema);
const BestTableTennisMalePlayer = mongoose.model("BestTableTennisMalePlayer", bestTableTennisMalePlayerSchema);
const BestTableTennisFemalePlayer = mongoose.model("BestTableTennisFemalePlayer",bestTableTennisFemalePlayerSchema);
const Department = mongoose.model('Department', departmentSchema);
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

module.exports = {
  DSAUser,
  SportsCoachUser,
  CoordinatorUser,
  RepUser,
  AdminPost,
  SportsRules,
  PlayerNominationForm,
  TrialEvent,
  CaptainUser,
  TeamRankings,
  Pools,
  createScheduleModel,
  RefUser,
  BestCricketer,
  BestFootballPlayer,
  BestFutsalPlayer,
  BestBasketballPlayer,
  BestTennisPlayer,
  BestSnookerPlayer,
  BestBadmintonMalePlayer,
  BestBadmintonFemalePlayer,
  BestTableTennisMalePlayer,
  BestTableTennisFemalePlayer,
  Department,
};
// Schedules (to be added in module.exports)
