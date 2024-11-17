
import Match from "./models/match.model.js";
import mongoose from "mongoose";
import { Notification } from "./models/notification.model.js";
import { updateTeamStats } from "./utils/updateTeamStats.js";
import { updatePlayerStats } from "./utils/updatePlayerStats.js";


async function getNotificationsForUser(userId) {
    console.log("userId", userId);

    // Fetch notifications from the database where `receiverId` is `userId`
    return await Notification.find({ receiverId: userId });
}



// Helper function to fetch matches
const fetchMatches = async () => {
    const currentDate = new Date();

    try {
        // Fetch one live match
        const liveMatch = await Match.findOne({ status: 'live' })
            .sort({ date: 1 })
            .populate('teams tournament')
            .exec();

        // Fetch one completed match
        const completedMatch = await Match.findOne({ status: 'completed', date: { $lt: currentDate } })
            .sort({ date: -1 }) // Most recent completed match
            .populate('teams tournament')
            .exec();

        return { liveMatch, completedMatch };
    } catch (error) {
        console.error('Error fetching matches:', error.message);
        throw new Error('Error fetching matches');
    }
};

export const setupSocketHandlers = (io) => {
    io.on('connection', async (socket) => {


        console.log('A user connected');


        try {
            // Fetch the matches on connection
            const { liveMatch, completedMatch } = await fetchMatches();

            // Emit the matches to the connected user
            socket.emit('carouselData', { liveMatch, completedMatch });

            // Periodically check for live match updates (optional)
            const interval = setInterval(async () => {
                const updatedLiveMatch = await Match.findOne({ status: 'live' })
                    .sort({ date: 1 })
                    .populate('teams tournament')
                    .exec();

                if (!updatedLiveMatch || !liveMatch || updatedLiveMatch.id !== liveMatch.id) {
                    socket.emit('liveMatchUpdated', updatedLiveMatch);
                }
            }, 10000); // Check every 10 seconds

            socket.on('disconnect', () => {
                console.log('A user disconnected:', socket.id);
                clearInterval(interval);
            });
        } catch (error) {
            console.error('Error during connection handling:', error.message);
            socket.emit('error', { message: 'Failed to fetch match data' });
        }

        const userRole = socket.handshake.query.role; // Assuming the role is passed during connection
        const userId = socket.handshake.query.userId;

        if (userRole === 'admin') {
            socket.join(userId); // Admin joins a room named after their user ID
            console.log(`Admin connected and joined room: ${userId}`);
            // Fetch and send notifications upon connection
            getNotificationsForUser(userId).then((notifications) => {
                console.log("notifications", notifications);

                io.to(userId).emit("notifications", notifications);
            });
        } else if (userRole === 'club-manager') {
            socket.join(userId); // Each club manager joins a room named by their userId
            console.log(`Club Manager connected: ${userId}`);
            // Fetch and send notifications upon connection
            getNotificationsForUser(userId).then((notifications) => {
                console.log("notifications", notifications);

                io.to(userId).emit("notifications", notifications);
            });
        }

        // Handling joining a specific match room
        socket.on('joinMatch', async (matchId) => {
            try {
                console.log(`User requested to join match: ${matchId}`);
                // Notify all admins about the new user joining a match room
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
                        path: 'toss',
                        model: 'Team'
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
                    .populate({
                        path: 'tournament',
                        model: 'Tournament'
                    })

                    .populate({ path: 'innings.battingPerformances.player', model: 'Player' })  // Populate player in battingPerformances
                    .populate('innings.bowlingPerformances.player').populate({ path: 'innings.fallOfWickets.batsmanOut', model: 'Player' })
                    .populate({ path: 'innings.battingPerformances.bowler', model: 'Player' }).populate({ path: 'innings.battingPerformances.fielder', model: 'Player' }).populate({ path: 'result.winner', model: 'Team' })
                    .populate({ path: 'round', model: 'Round' })


                //

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
                        path: 'tournament',
                        model: 'Tournament'
                    }).populate({
                        path: 'round',
                        model: 'Round'
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
                    const maxOvers = match.overs;
                    // Scenario 1: Limited Overs Match (One team bats second, and we check if they've won or lost)
                    if (secondInning) {
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
                            match.status = 'completed';

                        }
                        else if (match.innings[1].overs.length > maxOvers && match.innings[1].runs < match.innings[0].runs + 1) {
                            match.result = {
                                winner: firstInning.team,
                                by: 'runs',
                                margin: `${match.innings[0].runs + 1 - match.innings[1].runs} runs`, // e.g., "20 runs"
                                isTie: false
                            };
                            match.status = 'completed';

                        }
                        // Scenario 2: Tie Condition (Exact equal scores, all wickets lost)
                        if (match.innings[1].runs === match.innings[0].runs && secondInningWickets >= maxWickets || match.innings[1].runs === match.innings[0].runs && match.innings[1].overs.length > maxOvers) {
                            match.result = {
                                isTie: true,
                            };
                            match.status = 'completed';
                        }
                    }

                    // Save the match with the updated result
                    await match.save();
                    // Update team stats after match result
                    if (match.status === 'completed') {
                        await updateTeamStats(match._id); // Pass the match ID to update team stats
                        await updatePlayerStats(match._id)
                    }
                };
                // socket.join(matchId);
                // console.log(`User joined match room: ${matchId}`);

                let ballIsValid;
                let runScored;
                let isWicket;
                let boundary;
                let extraT;
                const currentInningIndex = match.currentInning - 1;
                const currentInning = match.innings[currentInningIndex];
                let currentOver = currentInning.overs[currentInning.overs.length - 1];

                if (!currentOver) {
                    let newOver = {
                        overNumber: overNumber + 1, // Set over number correctly
                        balls: [],
                        totalRuns: 0,
                        wickets: 0,
                        extras: 0,
                        bowler: bowlerId, // Replace with actual bowler ID
                    };
                    currentInning.overs.push(newOver);
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
                if (event.startsWith("6") || event.startsWith("4") || (event.startsWith("0")) || (event === 'Run Out') || (event === 'Caught') || (event === 'Bowled') || (event === 'LBW') || (event === 'Stumped')) {
                    ballIsValid = true;
                    if (ballNumber >= 5) {
                        currentInning.previousBowler = currentInning.currentBowler;
                        currentInning.currentBowler = null;
                        let newOver = {
                            overNumber: overNumber + 1, // Set over number correctly
                            balls: [],
                            totalRuns: 0,
                            wickets: 0,
                            extras: 0,
                            bowler: bowlerId, // Replace with actual bowler ID
                        };
                        currentInning.overs.push(newOver);
                        const temp = currentInning.currentStriker;
                        currentInning.currentStriker = currentInning.nonStriker;
                        currentInning.nonStriker = temp;
                    }
                    else if (!currentOver) {
                        // Fallback to create new over if the current over is not defined or already full (6 valid balls)
                        let newOver = {
                            overNumber: overNumber + 1,
                            balls: [],
                            totalRuns: 0,
                            wickets: 0,
                            extras: 0,
                            bowler: bowlerId,
                        };
                        currentInning.overs.push(newOver);
                    }
                }
                // fielder
                if (event.startsWith("0")) {

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
                            let newOver = {
                                overNumber: overNumber + 1, // Set over number correctly
                                balls: [],
                                totalRuns: 0,
                                wickets: 0,
                                extras: 0,
                                bowler: bowlerId, // Replace with actual bowler ID
                            };
                            currentInning.overs.push(newOver);
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
                            let newOver = {
                                overNumber: overNumber + 1, // Set over number correctly
                                balls: [],
                                totalRuns: 0,
                                wickets: 0,
                                extras: 0,
                                bowler: bowlerId, // Replace with actual bowler ID
                            };
                            currentInning.overs.push(newOver);
                        }

                    }
                }

                if (event.startsWith("-5")) {
                    extraT = "lb"; //bye runs
                    const runs = parseInt(event.slice(2));
                    ballIsValid = true;
                    bowlingPerformance.runsConceded += runs;
                    bowlingPerformance.balls += 1;
                    battingPerformance.ballsFaced += 1;
                    bowlingPerformance.runs += runs;
                    currentOver.totalRuns += runs;
                    runScored = runs;
                    currentInning.runs += runs;
                    if (runs === 1 || runs === 3) {
                        if (ballNumber >= 5 && ballIsValid) {
                            currentInning.previousBowler = currentInning.currentBowler;
                            currentInning.currentBowler = null;
                            let newOver = {
                                overNumber: overNumber + 1, // Set over number correctly
                                balls: [],
                                totalRuns: 0,
                                wickets: 0,
                                extras: 0,
                                bowler: bowlerId, // Replace with actual bowler ID
                            };
                            currentInning.overs.push(newOver);
                        }
                        else {
                            const temp = currentInning.currentStriker;
                            currentInning.currentStriker = currentInning.nonStriker;
                            currentInning.nonStriker = temp;
                        }
                    }
                    else {
                        if (ballNumber >= 5 && ballIsValid) {
                            currentInning.previousBowler = currentInning.currentBowler;
                            currentInning.currentBowler = null;
                            let newOver = {
                                overNumber: overNumber + 1, // Set over number correctly
                                balls: [],
                                totalRuns: 0,
                                wickets: 0,
                                extras: 0,
                                bowler: bowlerId, // Replace with actual bowler ID
                            };
                            currentInning.overs.push(newOver);
                        }
                    }


                }

                if (event.startsWith("-2")) {
                    extraT = "w";     //wide ball
                    const runs = parseInt(event.slice(2)); // Extract the runs

                    if (runs === 2 || runs === 4) {
                        const temp = currentInning.currentStriker;
                        currentInning.currentStriker = currentInning.nonStriker;
                        currentInning.nonStriker = temp;
                    }

                    bowlingPerformance.runsConceded += runs;
                    bowlingPerformance.wides += 1;

                    currentOver.totalRuns += runs;
                    runScored = runs;
                    currentInning.runs += runs;
                }

                if (event.startsWith("-3")) {        //no ball
                    extraT = 'nb';
                    const runs = parseInt(event.slice(2));
                    // Update the bowler's stats (extra run and no ball count)
                    bowlingPerformance.runsConceded += runs;
                    bowlingPerformance.noBalls += 1;

                    if (runs === 2 || runs === 4) {
                        const temp = currentInning.currentStriker;
                        currentInning.currentStriker = currentInning.nonStriker;
                        currentInning.nonStriker = temp;
                    }

                    runScored = runs;
                    currentOver.totalRuns += runs;
                    currentInning.runs += runs;

                }
                if (event === 'Run Out') {
                    runScored = RunOutruns;
                    isWicket = true;
                    currentInning.fallOfWickets.push({
                        runs: currentInning.runs + RunOutruns,
                        over: overNumber,
                        ball: ballNumber + 1,
                        batsmanOut: batsmanId
                    });
                    currentInning.wickets += 1;
                    currentInning.runs += runScored;
                    bowlingPerformance.balls += 1;
                    bowlingPerformance.runsConceded += RunOutruns;
                    battingPerformance.runs += RunOutruns;

                    battingPerformance.ballsFaced += 1;
                    // Bowled dismissal (batting)
                    // Update the bowler's performance (wicket)
                    bowlingPerformance.wickets += 1;
                    if (batsmanOut === 'striker') {
                        battingPerformance.isOut = true;
                        battingPerformance.dismissalType = 'run out';
                        battingPerformance.fielder = fielder;
                        currentInning.currentStriker = null; // Striker needs to be replaced
                    }
                    if (batsmanOut === "non-striker") {
                        nonStrikerbattingPerformance.isOut = true;
                        nonStrikerbattingPerformance.dismissalType = 'run out';
                        nonStrikerbattingPerformance.fielder = fielder;
                        currentInning.nonStriker = currentInning.currentStriker;
                        currentInning.currentStriker = null;
                    }

                }

                if (event === 'Caught') {
                    // Caught dismissal (batting)
                    isWicket = true;
                    console.log('Batsman is Caught');
                    currentInning.fallOfWickets.push({
                        runs: currentInning.runs,
                        over: overNumber,
                        ball: ballNumber + 1,
                        batsmanOut: batsmanId
                    });
                    currentInning.currentStriker = null; // Striker needs to be replaced
                    currentInning.wickets += 1;
                    // Update the batsman's performance
                    battingPerformance.ballsFaced += 1;
                    battingPerformance.isOut = true;
                    battingPerformance.dismissalType = 'Caught';
                    battingPerformance.bowler = bowlerId;
                    battingPerformance.fielder = fielder;

                    // Update the bowler's performance (wicket)
                    bowlingPerformance.wickets += 1;
                    bowlingPerformance.balls += 1;
                    runScored = 0;

                }

                if (event === 'Stumped') {
                    // Stumped dismissal (batting)
                    runScored = 0;
                    isWicket = true;
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
                    battingPerformance.ballsFaced = +1;
                    battingPerformance.dismissalType = 'Stumped';
                    battingPerformance.fielder = fielder;
                    bowlingPerformance.wickets += 1;
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
                    boundary = true;
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
                    boundary = true;
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
                    isWicket = true;
                    currentInning.fallOfWickets.push({
                        runs: currentInning.runs,
                        over: overNumber,
                        ball: ballNumber + 1,
                        batsmanOut: batsmanId
                    });
                    currentInning.currentStriker = null; // Striker needs to be replaced
                    currentInning.wickets += 1;
                    bowlingPerformance.balls += 1;
                    battingPerformance.ballsFaced += 1;

                    // Bowled dismissal (batting)
                    console.log('Batsman is Bowled');
                    runScored = 0;


                    // Update the batsman's performance
                    battingPerformance.isOut = true;
                    battingPerformance.dismissalType = 'Bowled';
                    battingPerformance.bowler = bowlerId;

                    // Update the bowler's performance (wicket)
                    bowlingPerformance.wickets += 1;

                }



                if (event === 'LBW') {
                    isWicket = true;
                    currentInning.fallOfWickets.push({
                        runs: currentInning.runs,
                        over: overNumber,
                        ball: ballNumber + 1,
                        batsmanOut: batsmanId
                    });
                    currentInning.currentStriker = null; // Striker needs to be replaced
                    currentInning.wickets += 1;
                    bowlingPerformance.balls += 1;
                    battingPerformance.ballsFaced += 1;
                    // Bowled dismissal (batting)
                    console.log('Batsman is LBW');
                    runScored = 0;


                    // Update the batsman's performance
                    battingPerformance.isOut = true;
                    battingPerformance.dismissalType = 'LBW';
                    battingPerformance.bowler = bowlerId;

                    // Update the bowler's performance (wicket)
                    bowlingPerformance.wickets += 1;

                    console.log("LBW");
                }

                if (event.startsWith("-5")) { // Bye runs


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
                        extras: {
                            type: extraT,
                            // {
                            //     enum: ['none', 'w', 'nb', 'bye', 'lb'], // Added bye and leg-bye
                            // },
                            // }
                        },


                    },
                    // isboundary
                    isOut: isWicket || false,
                    isBoundary: boundary,
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

                // await Match.findById(matchId).populate('innings.team innings.battingPerformances innings.bowlingPerformances').populate({
                //   path: 'teams',
                // }).populate({
                //   path: 'teams',
                // })
                //   .populate({
                //     path: 'playing11.team',  // Populate the team field in playing11
                //     model: 'Team' // The reference model is 'Team'
                //   })
                //   .populate({
                //     path: 'playing11.players', // Populate the players array in playing11
                //     model: 'Player' // The reference model is 'Player'
                //   })
                //   .populate({
                //     path: 'innings.nonStriker',
                //     model: 'Player'
                //   })
                //   .populate({
                //     path: 'innings.currentBowler',
                //     model: 'Player'
                //   })
                //   .populate({
                //     path: 'innings.currentStriker',
                //     model: 'Player'
                //   })
                //   .populate({
                //     path: 'innings.previousBowler',
                //     model: 'Player'
                //   })
                //   .populate({
                //     path: 'innings.team',
                //     model: 'Team'
                //   })
                //   .populate({ path: 'innings.battingPerformances.player', model: 'Player' })  // Populate player in battingPerformances
                //   .populate('innings.bowlingPerformances.player').populate({
                //     path: 'innings.fallOfWickets.batsmanOut', model: 'Player', select: 'playerName' // Replace with the fields you want to populate
                //   })
                // console.log("match.innings[1].overs.length", match.innings[1].overs.length);

                await checkForWinner(m1)

                // Emit the updated match data to all clients in the room (matchId)



                try {
                    // const m = await match.save();

                    const populatedMatch = await Match.findById(matchId)
                        .populate({
                            path: 'teams',
                        })
                        .populate({
                            path: 'tournament',
                            model: 'Tournament'
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
                        .populate({ path: 'innings.battingPerformances.bowler', model: 'Player' }).populate({ path: 'innings.battingPerformances.fielder', model: 'Player' }).populate({ path: 'result.winner', model: 'Team' })
                        .populate({ path: 'round', model: 'Round' });

                    // Emit the updated match data to all clients after successful population
                    io.to(matchId).emit('newBall', populatedMatch);
                    // io.to(matchId).emit('newBall', m1);

                } catch (error) {
                    console.error("Error occurred:", error); // Log any errors
                }




            } catch (error) {
                console.error('Error updating match:', error.message);
                socket.emit('error', { message: 'Failed to update ball data' });
            }
        });
        socket.on('newBowler', async (data) => {
            const { matchId, bowlerId } = data;
            console.log("new bowler1", bowlerId);


            try {
                // Find the match by ID and populate necessary fields
                const match = await Match.findById(matchId)
                    .populate({
                        path: 'teams',
                    })
                    .populate({
                        path: 'round',
                        model: 'Round'
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
                        path: 'tournament',
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
                try {
                    const m = await match.save();

                    const populatedMatch = await Match.findById(matchId)
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
                            path: 'tournament',
                        })
                        .populate({
                            path: 'innings.currentBowler',
                            model: 'Player'
                        })
                        .populate({
                            path: 'innings.currentStriker',
                            model: 'Player'
                        })
                        .populate({ path: 'round', model: 'Round' })
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


                    console.log("Populated match:", populatedMatch); // Check if match is populated

                    // Emit the updated match data to all clients after successful population
                    io.to(matchId).emit('newBowlerAssigned', populatedMatch);

                } catch (error) {
                    console.error("Error occurred:", error); // Log any errors
                }


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
                        path: 'round',
                        model: 'Round'
                    })
                    .populate({
                        path: 'tournament',
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

                try {
                    const m = await match.save();

                    const populatedMatch = await Match.findById(matchId)
                        .populate({
                            path: 'teams',
                        })
                        .populate({ path: 'round', model: 'Round' })
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
                            path: 'tournament',
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


                    console.log("Populated match:", populatedMatch); // Check if match is populated

                    io.to(matchId).emit('newBatsmanAssigned', populatedMatch);
                    // Emit the updated match data to all clients after successful population
                    // io.to(matchId).emit('newBowlerAssigned', populatedMatch);

                } catch (error) {
                    console.error("Error occurred:", error); // Log any errors
                }

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
                    }).populate({
                        path: 'tournament',
                    })
                    .populate({
                        path: 'round',
                        model: 'Round'
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



                try {
                    // const m = await match.save();
                    // console.log("Match saved successfully:", m1); // Check if match is saved

                    const populatedMatch = await Match.findById(matchId)
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
                        .populate({ path: 'innings.battingPerformances.bowler', model: 'Player' }).populate({ path: 'innings.battingPerformances.fielder', model: 'Player' }).populate({ path: 'result.winner', model: 'Team' })
                        .populate({ path: 'round', model: 'Round' });


                    console.log("Populated match:", populatedMatch); // Check if match is populated

                    // Emit the updated match data to all clients after successful population
                    io.to(matchId).emit('NewInningsStarted', populatedMatch);
                    // io.to(matchId).emit('newBall', populatedMatch);
                    // io.to(matchId).emit('newBall', m1);

                } catch (error) {
                    console.error("Error occurred:", error); // Log any errors
                }





                // Emit the updated match data to all clients

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
}


