import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from './app.js';
import { errorHandler } from "./middlewares/errorMiddleware.js";
import { Server } from "socket.io";
import http from "http";
import Match from "./models/match.model.js";
import { initializePlayers } from "./controllers/match.controller.js";
import mongoose from "mongoose";
// import { processBattingEvent } from "./utils/processBattingevent.js";

// Load environment variables
dotenv.config({
  path: './.env'
});

// Use error handler middleware
app.use(errorHandler);

// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.io with the HTTP server
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this according to your CORS needs
    methods: ["GET", "POST"]
  }
});

// Set `io` as a global variable
global.io = io;

// WebSocket event handling
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handling joining a specific match room
  socket.on('joinMatch', async (matchId) => {
    try {
      console.log(`User requested to join match: ${matchId}`);

      // Fetch the full match details including populated fields (teams and playing11)
      const match = await Match.findById(matchId)
        .populate({
          path: 'teams',
        })
        .populate({
          path: 'playing11.team',  // Populate the team field in playing11
          model: 'Team' // The reference model is 'Team'
        })
        .populate({
          path: 'playing11.players', // Populate the players array in playing11
          model: 'Player' // The reference model is 'Player'
        })
        .populate({
          path: 'innings.nonStriker',
          model: 'Player'
        })
        .populate({
          path: 'innings.currentBowler',
          model: 'Player'
        })
        .populate({
          path: 'innings.currentStriker',
          model: 'Player'
        })
        .populate({
          path: 'innings.previousBowler',
          model: 'Player'
        })
        .populate({
          path: 'innings.team',
          model: 'Team'
        })
        .populate({ path: 'innings.battingPerformances.player', model: 'Player' })  // Populate player in battingPerformances
        .populate('innings.bowlingPerformances.player').populate({ path: 'innings.fallOfWickets.batsmanOut', model: 'Player' })
        .populate({ path: 'innings.battingPerformances.bowler', model: 'Player' }).populate({ path: 'innings.battingPerformances.fielder', model: 'Player' }).populate({ path: 'result.winner', model: 'Team' });

      //
      console.log(match);

      if (!match) {
        return socket.emit('error', 'Match not found');
      }

      // Join the specific room for a match
      socket.join(matchId);
      console.log(`User joined match room: ${matchId}`);

      // Send the full match details to the user who joined
      socket.emit('matchDetails', match);

    } catch (error) {
      console.error(`Error joining match room: ${error.message}`);
      socket.emit('error', 'An error occurred while joining the match');
    }
  });
  // Handling scorer updates (ball-by-ball updates)
  socket.on('ballUpdate', async (data) => {
    console.log(data);

    const {
      matchId, fielder, bowlerId, RunOutruns, batsmanOut, nonStrikerbatsmanId, event, batsmanId, overNumber, ballNumber,
    } = data; // Destructure the required fields from the data

    try {
      const match = await Match.findById(matchId).populate('innings.team innings.battingPerformances innings.bowlingPerformances').populate({
        path: 'teams',
      }).populate({
        path: 'teams',
      })
        .populate({
          path: 'playing11.team',  // Populate the team field in playing11
          model: 'Team' // The reference model is 'Team'
        })
        .populate({
          path: 'playing11.players', // Populate the players array in playing11
          model: 'Player' // The reference model is 'Player'
        })
        .populate({
          path: 'innings.nonStriker',
          model: 'Player'
        })
        .populate({
          path: 'innings.currentBowler',
          model: 'Player'
        })
        .populate({
          path: 'innings.currentStriker',
          model: 'Player'
        })
        .populate({
          path: 'innings.previousBowler',
          model: 'Player'
        })
        .populate({
          path: 'innings.team',
          model: 'Team'
        })
        .populate({ path: 'innings.battingPerformances.player', model: 'Player' })  // Populate player in battingPerformances
        .populate('innings.bowlingPerformances.player').populate({ path: 'innings.fallOfWickets.batsmanOut', model: 'Player' })
        .populate({ path: 'innings.battingPerformances.bowler', model: 'Player' }).populate({ path: 'innings.battingPerformances.fielder', model: 'Player' }).populate({ path: 'result.winner', model: 'Team' });
      if (!match) {
        throw new Error('Match not found');
      }
      // Function to check and update match result after every ball
      const checkForWinner = async (match) => {

        const firstInning = match.innings[0]; // Assuming two innings (0 for first, 1 for second)
        const secondInning = match.innings[1];

        // Scenario 1: Limited Overs Match (One team bats second, and we check if they've won or lost)
        if (secondInning) {
          console.log("secondInning", match.innings[1].runs);
          const target = match.innings[0].runs + 1;
          const secondInningRuns = match.innings[1].runs;
          const secondInningWickets = secondInning.wickets;
          const maxWickets = 10; // Assuming 10 wickets in an inning

          // If team batting second has more runs, they win
          if (match.innings[1].runs >= match.innings[0].runs + 1) {
            match.result = {
              winner: secondInning.team, // Assuming `team` references the current team
              by: 'wickets',
              margin: `${maxWickets - secondInningWickets} wickets`, // e.g., "5 wickets"
              isTie: false
            };
            match.status = 'completed';
          }
          // If team batting second is all out and hasn't reached the target, team 1 wins
          else if (secondInningWickets >= maxWickets && match.innings[1].runs < match.innings[0].runs + 1) {
            match.result = {
              winner: firstInning.team,
              by: 'runs',
              margin: `${match.innings[0].runs + 1 - match.innings[1].runs} runs`, // e.g., "20 runs"
              isTie: false
            };
          }
        }

        // Scenario 2: Tie Condition (Exact equal scores, all wickets lost)
        if (match.innings[1].runs === match.innings[0].runs + 1 && secondInningWickets >= maxWickets) {
          match.result = {
            isTie: true,
          };
        }
        // Save the match with the updated result
        await match.save();
      };
      // socket.join(matchId);
      // console.log(`User joined match room: ${matchId}`);

      let ballIsValid;
      let runScored;
      const currentInningIndex = match.currentInning - 1;
      const currentInning = match.innings[currentInningIndex];
      let currentOver = currentInning.overs[currentInning.overs.length - 1];

      if (!currentOver) {
        currentOver = {
          overNumber: overNumber + 1, // Set over number correctly
          balls: [],
          totalRuns: 0,
          wickets: 0,
          extras: 0,
          bowler: bowlerId, // Replace with actual bowler ID
        };
        currentInning.overs.push(currentOver);
      }

      let battingPerformance = currentInning?.battingPerformances.find(bp =>
        bp.player.equals(new mongoose.Types.ObjectId(batsmanId))
      );
      let nonStrikerbattingPerformance = currentInning?.battingPerformances.find(bp =>
        bp.player.equals(new mongoose.Types.ObjectId(nonStrikerbatsmanId))
      );
      let newbattingPerformance;
      if (!battingPerformance) {
        newbattingPerformance = {
          player: batsmanId,
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          dismissalType: null,
          bowler: null,
          fielder: null
        };
        currentInning.battingPerformances.push(newbattingPerformance);
        match.markModified('innings');

        // Save the updated match document to the database
        await match.save();

        let battingPerformance = currentInning.battingPerformances.find(bp =>
          bp.player.equals(new mongoose.Types.ObjectId(batsmanId))
        );

      }

      let bowlingPerformance = currentInning.bowlingPerformances.find(bp =>
        bp.player.equals(new mongoose.Types.ObjectId(bowlerId))
      );
      console.log("bowlingPerformance", bowlingPerformance);

      if (!bowlingPerformance) {
        let newbowlingPerformance = {
          player: bowlerId,
          overs: 0,
          balls: 0,
          runsConceded: 0,
          wickets: 0,
          noBalls: 0,
          wides: 0,
          economy: 0
        };
        currentInning.bowlingPerformances.push(newbowlingPerformance);
        let bowlingPerformance = currentInning.bowlingPerformances.find(bp =>
          bp.player.equals(new mongoose.Types.ObjectId(bowlerId))
        );
      }
      if (event.startsWith("6") || event.startsWith("4") || (event.startsWith("0")) || (event === 'Run Out') || (event === 'Bowled') || (event === 'LBW') || (event === 'Stumped')) {
        ballIsValid = true;
        if (ballNumber >= 5) {
          currentInning.previousBowler = currentInning.currentBowler;
          currentInning.currentBowler = null;
          currentOver = {
            overNumber: overNumber + 1, // Set over number correctly
            balls: [],
            totalRuns: 0,
            wickets: 0,
            extras: 0,
            bowler: bowlerId, // Replace with actual bowler ID
          };
          currentInning.overs.push(currentOver);
          const temp = currentInning.currentStriker;
          currentInning.currentStriker = currentInning.nonStriker;
          currentInning.nonStriker = temp;
        }
        else if (!currentOver || currentOver.balls.length >= 6) {
          // Fallback to create new over if the current over is not defined or already full (6 valid balls)
          currentOver = {
            overNumber: overNumber + 1,
            balls: [],
            totalRuns: 0,
            wickets: 0,
            extras: 0,
            bowler: bowlerId,
          };
          currentInning.overs.push(currentOver);
        }
      }
      // fielder
      if (event.startsWith("0")) {
        if (ballNumber >= 5 && ballIsValid) {
          const temp = currentInning.currentStriker;
          currentInning.currentStriker = currentInning.nonStriker;
          currentInning.nonStriker = temp;
        }
        runScored = 0;
        battingPerformance.ballsFaced += 1;
        bowlingPerformance.balls += 1;
      }
      if (event.startsWith("-8")) {    //running between wickets
        const runs = parseInt(event.slice(2));
        ballIsValid = true;
        if (runs === 1 || runs === 3) {
          if (ballNumber >= 5 && ballIsValid) {
            currentOver.totalRuns += runs;
            battingPerformance.runs += runs;
            battingPerformance.ballsFaced += 1;
            bowlingPerformance.runsConceded += runs;
            bowlingPerformance.balls += 1;
            currentInning.runs += runs;
            runScored = runs;

            currentInning.previousBowler = currentInning.currentBowler;
            currentInning.currentBowler = null;
            currentOver = {
              overNumber: overNumber + 1, // Set over number correctly
              balls: [],
              totalRuns: 0,
              wickets: 0,
              extras: 0,
              bowler: bowlerId, // Replace with actual bowler ID
            };
            currentInning.overs.push(currentOver);
          }
          else {
            const temp = currentInning.currentStriker;
            currentInning.currentStriker = currentInning.nonStriker;
            currentInning.nonStriker = temp;
            currentOver.totalRuns += runs;
            battingPerformance.runs += runs;
            battingPerformance.ballsFaced += 1;
            bowlingPerformance.runsConceded += runs;
            bowlingPerformance.balls += 1;
            currentInning.runs += runs;
            runScored = runs;
          }
        } else if ((runs === 2 || runs === 4)) {
          currentOver.totalRuns += runs;
          battingPerformance.runs += runs;
          battingPerformance.ballsFaced += 1;
          bowlingPerformance.runsConceded += runs;
          bowlingPerformance.balls += 1;
          currentInning.runs += runs;
          runScored = runs;

          if (ballNumber >= 5 && ballIsValid) {
            currentInning.previousBowler = currentInning.currentBowler;
            currentInning.currentBowler = null;
            currentOver = {
              overNumber: overNumber + 1, // Set over number correctly
              balls: [],
              totalRuns: 0,
              wickets: 0,
              extras: 0,
              bowler: bowlerId, // Replace with actual bowler ID
            };
            currentInning.overs.push(currentOver);
          }

        }
      }
      if (event.startsWith("-5")) {      //bye runs
        const runs = parseInt(event.slice(2));
        bowlingPerformance.runsConceded += runs;
        bowlingPerformance.balls += 1;
        battingPerformance.ballsFaced += 1;
        bowlingPerformance.runs += runs;
        currentOver.totalRuns += runs;
        runScored = runs;
        ballIsValid = true;
        currentInning.runs += runs;
        if (runs === 1 || runs === 3) {
          if (ballNumber >= 5 && ballIsValid) {
            currentInning.previousBowler = currentInning.currentBowler;
            currentInning.currentBowler = null;
            currentOver = {
              overNumber: overNumber + 1, // Set over number correctly
              balls: [],
              totalRuns: 0,
              wickets: 0,
              extras: 0,
              bowler: bowlerId, // Replace with actual bowler ID
            };
            currentInning.overs.push(currentOver);
          }
          else {
            const temp = currentInning.currentStriker;
            currentInning.currentStriker = currentInning.nonStriker;
            currentInning.nonStriker = temp;
          }
        }


      }
      if (event.startsWith("-2")) {       //wide ball
        const runs = parseInt(event.slice(2));
        currentOver.totalRuns += runs;
        runScored = runs;
        currentInning.runs += runs;
      }
      if (event.startsWith("-3")) {        //no ball

        const runs = parseInt(event.slice(2));
        runScored = runs;
        currentOver.totalRuns += runs;
        currentInning.runs += runs;

      }
      if (event === 'Run Out') {
        console.log("nonStrikerbattingPerformance", nonStrikerbattingPerformance);
        currentInning.fallOfWickets.push({
          runs: currentInning.runs + RunOutruns,
          over: overNumber,
          ball: ballNumber + 1,
          batsmanOut: batsmanId
        });
        currentInning.wickets += 1;
        bowlingPerformance.balls += 1;
        battingPerformance.runs += RunOutruns;
        battingPerformance.ballsFaced += 1;
        // Bowled dismissal (batting)
        runScored = 0;
        // Update the bowler's performance (wicket)
        bowlingPerformance.wickets += 1;
        if (batsmanOut === 'striker') {
          battingPerformance.isOut = true;
          battingPerformance.dismissalType = 'Caught';
          battingPerformance.fielder = fielder;
          currentInning.currentStriker = null; // Striker needs to be replaced
        }
        if (batsmanOut === "non-striker") {
          nonStrikerbattingPerformance.isOut = true;
          nonStrikerbattingPerformance.dismissalType = 'Caught';
          nonStrikerbattingPerformance.fielder = fielder;
          currentInning.nonStriker = currentInning.currentStriker;
          currentInning.currentStriker = null;
        }

      }

      if (event === 'Caught') {
        currentInning.fallOfWickets.push({
          runs: currentInning.runs,
          over: overNumber,
          ball: ballNumber + 1,
          batsmanOut: batsmanId
        });
        currentInning.currentStriker = null; // Striker needs to be replaced
        currentInning.wickets += 1;
        bowlingPerformance.balls += 1;
        // Bowled dismissal (batting)
        console.log('Batsman is Bowled');
        runScored = 0;


        // Update the batsman's performance
        battingPerformance.isOut = true;
        battingPerformance.dismissalType = 'Caught';
        battingPerformance.bowler = bowlerId;

        // Update the bowler's performance (wicket)
        bowlingPerformance.wickets += 1;
      }
      if (event === 'Stumped') {
        currentInning.fallOfWickets.push({
          runs: currentInning.runs,
          over: overNumber,
          ball: ballNumber + 1,
          batsmanOut: batsmanId
        });
        currentInning.currentStriker = null; // Striker needs to be replaced
        currentInning.wickets += 1;
        bowlingPerformance.balls += 1;
        // Bowled dismissal (batting)
        runScored = 0;


        // Update the batsman's performance
        battingPerformance.isOut = true;
        battingPerformance.dismissalType = 'Stumped';

        // Example: Player run out, change on-strike batsman
        runScored = 0;
        currentInning.wickets += 1;

        console.log("Stumped");
      }
      if (event === 'LBW') {
        currentInning.fallOfWickets.push({
          runs: currentInning.runs,
          over: overNumber,
          ball: ballNumber + 1,
          batsmanOut: batsmanId
        });
        currentInning.currentStriker = null; // Striker needs to be replaced
        currentInning.wickets += 1;
        bowlingPerformance.balls += 1;
        // Bowled dismissal (batting)
        console.log('Batsman is Bowled');
        runScored = 0;


        // Update the batsman's performance
        battingPerformance.isOut = true;
        battingPerformance.dismissalType = 'LBW';
        battingPerformance.bowler = bowlerId;

        // Update the bowler's performance (wicket)
        bowlingPerformance.wickets += 1;

        console.log("LBW");
      }

      // console.log("currentInning", currentInning);

      //from here to update invidual batting performance
      // Find the batting performance for the batsman



      // Handle different types of events (batting and bowling)

      // if (event.startsWith("-8")) {
      //   // Running between wickets event (batting)
      //   const runs = parseInt(event.slice(2)); // Extract the runs
      //   console.log(`Running between wickets: ${runs} runs`);
      //   runScored = runs;

      //   // Update runs and balls faced for the batsman
      //   battingPerformance.runs += runs;
      //   battingPerformance.ballsFaced += 1;
      //   console.log(`Batsman's updated runs: ${battingPerformance.runs}`);

      //   // Update runs conceded and balls bowled for the bowler
      //   // bowlingPerformance.runsConceded += runs;
      //   // bowlingPerformance.balls += 1;

      // }
      //  if (event === 6 || event === 4) {
      //   // Boundary event (batting)
      //   console.log(`Boundary: ${event} runs`);

      //   // Update runs and balls faced for the batsman
      //   battingPerformance.runs += event;
      //   battingPerformance.ballsFaced += 1;

      //   // Update runs conceded and balls bowled for the bowler
      //   bowlingPerformance.runsConceded += event;
      //   bowlingPerformance.balls += 1;

      // Update boundary stats for the batsman
      if (event.startsWith("4")) {
        runScored = 4;
        currentOver.totalRuns += 4;

        currentInning.runs += 4;
        battingPerformance.runs += 4;
        battingPerformance.ballsFaced += 1;
        // Update runs conceded and balls bowled for the bowler
        bowlingPerformance.runsConceded += 4;
        bowlingPerformance.balls += 1;
        battingPerformance.fours += 1;
      }
      if (event.startsWith("6")) {
        runScored = 6;
        currentOver.totalRuns += 6;

        currentInning.runs += 6;
        battingPerformance.runs += 6;
        battingPerformance.ballsFaced += 1;

        // Update runs conceded and balls bowled for the bowler
        bowlingPerformance.runsConceded += 6;
        bowlingPerformance.balls += 1;
        battingPerformance.sixes += 1;
      }

      if (event === 'Bowled') {
        currentInning.fallOfWickets.push({
          runs: currentInning.runs,
          over: overNumber,
          ball: ballNumber + 1,
          batsmanOut: batsmanId
        });
        currentInning.currentStriker = null; // Striker needs to be replaced
        currentInning.wickets += 1;
        bowlingPerformance.balls += 1;
        // Bowled dismissal (batting)
        console.log('Batsman is Bowled');
        runScored = 0;


        // Update the batsman's performance
        battingPerformance.isOut = true;
        battingPerformance.dismissalType = 'Bowled';
        battingPerformance.bowler = bowlerId;

        // Update the bowler's performance (wicket)
        bowlingPerformance.wickets += 1;

      } if (event === 'Caught') {
        // Caught dismissal (batting)
        console.log('Batsman is Caught');
        currentInning.fallOfWickets.push({
          runs: currentInning.runs,
          over: overNumber,
          ball: ballNumber + 1,
          batsmanOut: batsmanId
        });
        currentInning.currentStriker = null; // Striker needs to be replaced
        currentInning.wickets += 1;
        bowlingPerformance.balls += 1;
        // Update the batsman's performance
        battingPerformance.isOut = true;
        battingPerformance.dismissalType = 'Caught';
        battingPerformance.bowler = bowlerId;
        battingPerformance.fielder = fielder;

        // Update the bowler's performance (wicket)
        bowlingPerformance.wickets += 1;
        bowlingPerformance.balls += 1;

      } if (event === 'Stumped') {
        // Stumped dismissal (batting)
        console.log('Batsman is Stumped');
        currentInning.fallOfWickets.push({
          runs: currentInning.runs,
          over: overNumber,
          ball: ballNumber + 1,
          batsmanOut: batsmanId
        });
        currentInning.currentStriker = null; // Striker needs to be replaced
        currentInning.wickets += 1;
        bowlingPerformance.balls += 1;
        // Update the batsman's performance
        battingPerformance.isOut = true;
        battingPerformance.dismissalType = 'Stumped';
        battingPerformance.fielder = fielder;


        // Update the bowler's performance (wicket)
        bowlingPerformance.wickets += 1;
        bowlingPerformance.balls += 1;

      } if (event === 'LBW') {
        // LBW dismissal (batting)
        console.log('Batsman is LBW');
        currentInning.fallOfWickets.push({
          runs: currentInning.runs,
          over: overNumber,
          ball: ballNumber,
          batsmanOut: batsmanId
        });
        currentInning.currentStriker = null; // Striker needs to be replaced
        currentInning.wickets += 1;
        bowlingPerformance.balls += 1;
        // Update the batsman's performance
        battingPerformance.isOut = true;
        battingPerformance.dismissalType = 'LBW';
        battingPerformance.bowler = bowlerId;

        // Update the bowler's performance (wicket)
        bowlingPerformance.wickets += 1;
        bowlingPerformance.balls += 1;

      } if (event.startsWith("-5")) { // Bye runs


      } if (event.startsWith("-2")) { // Wide ball
        const runs = parseInt(event.slice(2)); // Extract the runs
        console.log(`Wide ball: ${runs}`);
        // Update the bowler's stats (extra run and wide count)
        bowlingPerformance.runsConceded += runs;
        bowlingPerformance.wides += 1;
      } if (event.startsWith("-3")) { // No ball
        const runs = parseInt(event.slice(2)); // Extract the runs
        console.log(`No ball: ${runs}`);

        // Update the bowler's stats (extra run and no ball count)
        bowlingPerformance.runsConceded += runs;
        bowlingPerformance.noBalls += 1;
      }
      if (!currentInning) {
        throw new Error('Inning not found');
      }

      // Check if we need to create a new over
      // If the latest ballNumber is 5 (means next valid ball will be the 6th), create a new over
      // if (ballNumber === 5 && ballIsValid) {
      //   currentInning.previousBowler = currentInning.currentBowler; // Set the current bowler to previous bowler
      // currentInning.currentBowler = null;
      // currentOver = {
      //   overNumber: over || currentInning.overs.length + 1, // Set over number correctly
      //   balls: [],
      //   totalRuns: 0,
      //   wickets: 0,
      //   extras: 0,
      //   bowler: bowlerId, // Replace with actual bowler ID
      // };
      // currentInning.overs.push(currentOver);
      // } else if (!currentOver || currentOver.balls.length >= 6) {
      //   // Fallback to create new over if the current over is not defined or already full (6 valid balls)
      //   currentOver = {
      //     overNumber: over || currentInning.overs.length + 1,
      //     balls: [],
      //     totalRuns: 0,
      //     wickets: 0,
      //     extras: 0,
      //     bowler: bowlerId,
      //   };
      //   currentInning.overs.push(currentOver);
      // }

      // Adjust ball number if the current ball is valid
      const adjustedBallNumber = ballIsValid ? ballNumber + 1 : ballNumber;

      // Create the new ball event
      const newBall = {
        ballNumber: adjustedBallNumber, // Increment for valid ball
        runs: {
          scored: runScored,
          extras: 0,
        },
        isOut: false,
        bowlerId: bowlerId,
        batsmanId: batsmanId,
        isValidBall: ballIsValid,
      };

      // // Push the new ball to the current over
      currentOver.balls.push(newBall);

      // if (ballIsValid) {
      //   bowlingPerformance.balls += 1
      // }
      // // Update over and inning stats
      // if (wickets === 1) {
      //   currentOver.wickets += wickets;
      //   currentInning.currentStriker = null;

      //   currentInning.fallOfWickets.push({
      //     runs: currentInning.runs,
      //     over: overNumber,
      //     ball: ballNumber + 1,
      //     batsmanOut: batsmanId
      //   });
      // }

      // currentInning.runs += runs + (extras?.runs || 0);
      // currentInning.extras.total += extras?.runs || 0;
      // currentInning.extras.wides += extras?.type === 'wide' ? extras.runs : 0;
      // currentInning.extras.noBalls += extras?.type === 'no-ball' ? extras.runs : 0;

      // // Update individual batting and bowling performances (striker and bowler)
      // const strikerPerformance = currentInning.battingPerformances.find(p => p.player.equals(currentInning.currentStriker));
      // const nonStrikerPerformance = currentInning.battingPerformances.find(p => p.player.equals(currentInning.nonStriker));
      // const bowlerPerformance = currentInning.bowlingPerformances.find(p => p.player.equals(currentInning.currentBowler));

      // if (strikerPerformance && ballIsValid) {
      //   strikerPerformance.runs += runs;
      //   strikerPerformance.ballsFaced += 1;
      //   if (runs === 4) strikerPerformance.fours += 1;
      //   if (runs === 6) strikerPerformance.sixes += 1;
      //   strikerPerformance.strikeRate = (strikerPerformance.runs / strikerPerformance.ballsFaced) * 100;
      // }

      // if (bowlerPerformance) {
      //   bowlerPerformance.balls += 1;
      //   bowlerPerformance.runsConceded += runs + (extras?.runs || 0);
      //   if (wicket) bowlerPerformance.wickets += 1;
      //   bowlerPerformance.economy = (bowlerPerformance.runsConceded / bowlerPerformance.balls) * 6;
      // }

      // Handle wicket logic (for bowled, caught, etc.)
      // if (wickets) {
      //   const { type, by } = wicket;

      //   if (['bowled', 'caught', 'LBW', 'stumped'].includes(type)) {
      //     strikerPerformance.isOut = true;
      //     strikerPerformance.dismissalType = type;
      //     strikerPerformance.bowler = currentInning.currentBowler;
      //     strikerPerformance.fielder = by;

      //     currentInning.currentStriker = null; // Striker needs to be replaced
      //   } else if (type === 'run-out') {
      //     if (wicket.out === 'striker') {
      //       strikerPerformance.isOut = true;
      //       strikerPerformance.dismissalType = 'run-out';
      //       strikerPerformance.fielder = by;

      //       currentInning.currentStriker = null;
      //     } else if (wicket.out === 'non-striker') {
      //       nonStrikerPerformance.isOut = true;
      //       nonStrikerPerformance.dismissalType = 'run-out';
      //       nonStrikerPerformance.fielder = by;

      //       currentInning.nonStriker = currentInning.currentStriker;
      //       currentInning.currentStriker = null;
      //     }
      //   }
      // }

      // Save the updated match
      const m1 = await match.save();

      await Match.findById(matchId).populate('innings.team innings.battingPerformances innings.bowlingPerformances').populate({
        path: 'teams',
      }).populate({
        path: 'teams',
      })
        .populate({
          path: 'playing11.team',  // Populate the team field in playing11
          model: 'Team' // The reference model is 'Team'
        })
        .populate({
          path: 'playing11.players', // Populate the players array in playing11
          model: 'Player' // The reference model is 'Player'
        })
        .populate({
          path: 'innings.nonStriker',
          model: 'Player'
        })
        .populate({
          path: 'innings.currentBowler',
          model: 'Player'
        })
        .populate({
          path: 'innings.currentStriker',
          model: 'Player'
        })
        .populate({
          path: 'innings.previousBowler',
          model: 'Player'
        })
        .populate({
          path: 'innings.team',
          model: 'Team'
        })
        .populate({ path: 'innings.battingPerformances.player', model: 'Player' })  // Populate player in battingPerformances
        .populate('innings.bowlingPerformances.player').populate({
          path: 'innings.fallOfWickets.batsmanOut', model: 'Player', select: 'playerName' // Replace with the fields you want to populate
        })
      await checkForWinner(match)
      console.log("m1", m1.innings[0].fallOfWickets);
      console.log("match", match.innings[0].fallOfWickets);

      // Emit the updated match data to all clients in the room (matchId)
      io.to(matchId).emit('newBall', m1);

    } catch (error) {
      console.error('Error updating match:', error.message);
      socket.emit('error', { message: 'Failed to update ball data' });
    }
  });
  socket.on('newBowler', async (data) => {
    const { matchId, bowlerId } = data;
    console.log(data);


    try {
      // Find the match by ID and populate necessary fields
      const match = await Match.findById(matchId)
        .populate({
          path: 'teams',
        })
        .populate({
          path: 'playing11.team',  // Populate the team field in playing11
          model: 'Team' // The reference model is 'Team'
        })
        .populate({
          path: 'playing11.players', // Populate the players array in playing11
          model: 'Player' // The reference model is 'Player'
        })
        .populate({
          path: 'innings.nonStriker',
          model: 'Player'
        })
        .populate({
          path: 'innings.currentBowler',
          model: 'Player'
        })
        .populate({
          path: 'innings.currentStriker',
          model: 'Player'
        })
        .populate({
          path: 'innings.previousBowler',
          model: 'Player'
        })
        .populate({
          path: 'innings.team',
          model: 'Team'
        })
        .populate({ path: 'innings.battingPerformances.player', model: 'Player' })  // Populate player in battingPerformances
        .populate('innings.bowlingPerformances.player').populate({ path: 'innings.fallOfWickets.batsmanOut', model: 'Player' })
        .populate({ path: 'innings.battingPerformances.bowler', model: 'Player' }).populate({ path: 'innings.fallOfWickets.batsmanOut', model: 'Player' });

      if (!match) {
        throw new Error('Match not found');
      }

      // Get the current inning based on match.currentInning
      const currentInningIndex = match.currentInning - 1;
      const currentInning = match.innings[currentInningIndex];


      if (!currentInning) {
        throw new Error('Inning not found');
      }


      // Set the new bowler
      currentInning.currentBowler = bowlerId;
      // Find the bowling performance of the bowler

      let bowlingPerformance = currentInning.bowlingPerformances.find(bp =>
        bp.player.equals(new mongoose.Types.ObjectId(bowlerId))
      );
      if (!bowlingPerformance) {
        // If not found, create a new bowling performance
        let newbowlingPerformance = {
          player: bowlerId,
          overs: 0,
          balls: 0,
          runsConceded: 0,
          wickets: 0,
          noBalls: 0,
          wides: 0,
          economy: 0
        };
        currentInning.bowlingPerformances.push(newbowlingPerformance);
      }
      // Save the match
      await match.save();

      // Emit the updated match data to all clients
      io.to(matchId).emit('newBowlerAssigned', match);

    } catch (error) {
      console.error('Error assigning new bowler:', error.message);
      socket.emit('error', { message: 'Failed to assign new bowler' });
    }
  });
  socket.on('newBatsman', async (data) => {
    const { matchId, batsmanId } = data;

    try {
      // Find the match by ID and populate necessary fields
      const match = await Match.findById(matchId)
        .populate('innings.team innings.battingPerformances innings.bowlingPerformances')
        .populate({
          path: 'teams',
        })
        .populate({
          path: 'playing11.team',  // Populate the team field in playing11
          model: 'Team' // The reference model is 'Team'
        })
        .populate({
          path: 'playing11.players', // Populate the players array in playing11
          model: 'Player' // The reference model is 'Player'
        })
        .populate({
          path: 'innings.nonStriker',
          model: 'Player'
        })
        .populate({
          path: 'innings.currentBowler',
          model: 'Player'
        })
        .populate({
          path: 'innings.currentStriker',
          model: 'Player'
        })
        .populate({
          path: 'innings.previousBowler',
          model: 'Player'
        })
        .populate({
          path: 'innings.team',
          model: 'Team'
        })
        .populate({ path: 'innings.battingPerformances.player', model: 'Player' })  // Populate player in battingPerformances
        .populate('innings.bowlingPerformances.player').populate({ path: 'innings.fallOfWickets.batsmanOut', model: 'Player' })
        .populate({ path: 'innings.battingPerformances.bowler', model: 'Player' }).populate({ path: 'innings.fallOfWickets.batsmanOut', model: 'Player' });

      if (!match) {
        throw new Error('Match not found');
      }
      const currentInningIndex = match.currentInning - 1;
      const currentInning = match.innings[currentInningIndex];
      let battingPerformance = currentInning.battingPerformances.find(bp => bp.player.toString() === batsmanId);

      if (!battingPerformance) {
        // If not found, create a new batting performance
        let battingPerformance = {
          player: batsmanId,
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          dismissalType: null,
          bowler: null,
          fielder: null
        };
        currentInning.battingPerformances.push(battingPerformance);
      }
      if (!currentInning) {
        throw new Error('Inning not found');
      }

      // Set the new bowler
      currentInning.currentStriker = batsmanId;

      // Save the match
      await match.save();

      // Emit the updated match data to all clients
      io.to(matchId).emit('newBatsmanAssigned', match);

    } catch (error) {
      console.error('Error assigning new batsman:', error.message);
      socket.emit('error', { message: 'Failed to assign new batsman' });
    }
  });
  socket.on('startNewInnings', async (data) => {
    const { matchId } = data;
    console.log(data);

    try {
      // Find the match by ID and populate necessary fields
      const match = await Match.findById(matchId)
        .populate('innings.team innings.battingPerformances innings.bowlingPerformances')
        .populate({
          path: 'teams',
        })
        .populate({
          path: 'playing11.team',
          model: 'Team',
        })
        .populate({
          path: 'playing11.players',
          model: 'Player',
        })
        .populate({
          path: 'innings.nonStriker innings.currentBowler innings.currentStriker innings.previousBowler',
          model: 'Player',
        })
        .populate({
          path: 'innings.team',
          model: 'Team',
        }).populate({ path: 'innings.battingPerformances.player', model: 'Player' })  // Populate player in battingPerformances
        .populate('innings.bowlingPerformances.player');

      if (!match) {
        throw new Error('Match not found');
      }

      // Check if it's the end of the first inning and start the second inning
      if (match.currentInning) {
        match.currentInning += 1; // Increment current inning
      } else {
        match.currentInning = 1; // In case currentInning was never set, start from 1
      }


      // Save the updated match
      await match.save();

      // Emit the updated match data to all clients
      io.to(matchId).emit('NewInningsStarted', match);

    } catch (error) {
      console.error('Error starting new innings:', error.message);
      socket.emit('error', { message: 'Failed to start new innings' });
    }
  });

  // Handling disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Connect to the MongoDB database
connectDB()
  .then(() => {
    // Start the server after DB connection is established
    server.listen(process.env.PORT || 8000, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
