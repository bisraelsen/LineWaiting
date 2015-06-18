/*
 * Requires:
 *     psiturk.js
 *     utils.js
 */
// this disables console.log for production
//console.log = function() {}
// Initalize psiturk object
var psiTurk = PsiTurk(uniqueId, adServerLoc);

////
//// GAME GLOBAL VARS
////
var PLAYER_SCORE = 0; //Keeps track of the players score
var NUM_LINES = 2; //Change to add more lines to the program 3 works well, I think
var LINES = []; //This is an array that will be used to keep track of all the persons in each line
var LINE_REWARDS = [2, 6]; //This sets the reward for each line. If you increase the NUM_LINES, add additional entries here
var lineLength = [1, 5]; //This sets the length of each line. If you increase the NUM_LINES, add additional entries here
///These control the intermediate reward function
var INTER_REWARDS = false; //Set this to true if you want the estimate intermediate reward to display, false if you don't
var INTER_REWARD = 0;
var INTER_REWARD_TIC = 0;
var REWARD_TIC = 0;
var REWARD = 0;
var PLAYER;
var PLAYER_START_X = 680;
var PERSON_X_SPACING = 30; // X distance between people in lines
var SERVICE_COUNTDOWN_INIT = PERSON_X_SPACING;
var PERSON_Y_OFFSET = 20; // distance to offset in Y direction when servicing
var PERSON_FRONT_OF_LINE = 60; //X location of the front of the line
var GAME_BOARD_HEIGHT = 200;
var SCORE_POS_Y = 40;
var GAME_BOARD_Y = SCORE_POS_Y + 50;
var TICKTOCK_INTERVAL = 20; //rate at which the animate function is called in ms
var EVENT_INTERVAL = 1000; // interval (in ms) between arrival/departure events
var GAME_DURATION = 120 * 1000; // experiment duration in msec
var CHA_CHING = new Audio('../static/media/Cha-Ching.m4a');

var IMG_PERSON = new Image();
var IMG_PLAYER = new Image();
var EpisodeNum = 1;
var longLine;
var positionInLine;
var REWARD_RECORD;
var rewardRecFlag = false;
var REWARDING = false; //tracks when player is being rewarded
var KEY_RECORD = []; //record for all game move key strokes
var KEY_TIME_RECORD = []; //associated time for all key strokes
var GAME_STARTED = 0;
var TicktockHandle; // clock handle
var save2ServerHandle; //handle for the save2Server that will be called until it is successful
var TIME_AT_REWARD = 300 * 1000;
var TIME_AT_ENTER;
var TIME_AT_SELECT;
var TIME_CHANGE_LINE;
var FlagLineChange = false;
var timeAtRew = TIME_AT_REWARD;
var SLACKING_RECORD = [];
var SLACKING_TIME = [];
var slackingCheck = false;
var DEFECT_RECORD = [];
var DEFECT_TIME = [];
var Defect_check = false;
// DEBUG -- new line length should be a draw from a binomial
// Math.round(drawGaussianSample(12, 3, 7, 17));
var lineLengthNew = lineLength;
var tstWOInstructions = true; //for testing and skipping instructions
var EpisodeFlag = 0;
var action;

// MIKE VARIABLES
var newEpisodeFlag = 0; // should we reset the round at the next tick
var masterClock;;       // master clock (milliseconds)
var eventClock;    // time since last event (msec)
var masterClock;   // time since game began (msec)
var timeRemaining; // time left in game (sec)
var serviceCountdown; // # ticktocks remaining for servicing lines
var playerHorizontalMoveRequest;
var playerVerticalMoveRequest;
var playerActed; // did player take an action this event
var playerSelectingLine = true; 
            // indicates whether the player is in the line selection area
var leftGap; // did line advance leave a gap in front of the player?

//Randomly decide between having intermediate rewards on or off
if (Math.round(Math.random()) == 0) {
   INTER_REWARDS = false;
   //INTER_REWARDS = true;
   //console.log("condition is " + INTER_REWARDS);
} else {
   INTER_REWARDS = true;
   //console.log("condittion is " + INTER_REWARDS);
}
//force condition to get balanced data
INTER_REWARDS = false;
// set condition in database
//psiTurk.taskdata.set('cond',INTER_REWARDS)

var mycounterbalance = counterbalance; // they tell you which condition you have been assigned to
// they are not used in the stroop code but may be useful to you

//List of all pages that need to be loaded
var pages = [
   "instructions/instruct-p1.html",
   "instructions/instruct-p2.html",
   "instructions/instruct-p3.html",
   "instructions/instruct-p3_a.html",
   "instructions/instruct-p4.html",
   "instructions/instruct-p5.html",
   "instructions/instruct-p6_1.html",
   "instructions/instruct-p6_2.html",
   "instructions/instruct-p7.html",
   "instructions/instruct-bypass.html",
   "stage.html"
];

psiTurk.preloadPages(pages);

//change last page based on the experimental condition
if (!tstWOInstructions) {
   if (INTER_REWARDS) {
      var instructionPages = [ // add as a list as many pages as you like
         "instructions/instruct-p1.html",
         "instructions/instruct-p2.html",
         "instructions/instruct-p3.html",
         "instructions/instruct-p4.html",
         "instructions/instruct-p5.html",
         "instructions/instruct-p6_1.html",
         "instructions/instruct-p7.html"
      ];
   } else {
      var instructionPages = [ // add as a list as many pages as you like
         "instructions/instruct-p1.html",
         "instructions/instruct-p2.html",
         "instructions/instruct-p3.html",
         "instructions/instruct-p3_a.html",
         "instructions/instruct-p4.html",
         "instructions/instruct-p5.html",
         "instructions/instruct-p6_2.html"
      ];
   }
} else {
   var instructionPages = [ // add as a list as many pages as you like
      "instructions/instruct-bypass.html"
   ];
}

/********************
 * HTML manipulation
 *
 * All HTML files in the templates directory are requested
 * from the server when the PsiTurk object is created above. We
 * need code to get those pages from the PsiTurk object and
 * insert them into the document.
 *
 ********************/

////
//// CLASSES
////

//Person objects are created for each of the simulated persons
// in the lines as the appear on screen
function Person(X, Y) {
   this.X = X;
   this.Y = Y;
   this.PC = false;
}
//Player is a subclass of Person that represents the player character
function Player(X, Y, line, position) {
   this.X = X;
   this.Y = Y;
   this.line = line;
   this.position = position;
   this.PC = true;
}
//Defining the inheritance
Player.prototype = new Person(0, 0);

//A Line object is made for each of the lines that appears on
// screen. It keeps track of what operations the line is currently
// undergoing (arrival, service)
function Line(Y) {
   this.Y = Y;
   this.Persons = [];
}

//This function adds a person to a line
Line.prototype.addPerson = function(P) {
   this.Persons.push(P);
}

//This function gets the x position to add a new figure
Line.prototype.getNextXPos = function() {
   if (this.Persons.length == 0) {
      // nobody in the line
      xpos = PERSON_FRONT_OF_LINE;
   } else {
      xpos = this.Persons[this.Persons.length - 1].X + PERSON_X_SPACING;
   }

   return xpos;
}

function drawGaussianSample(mu, sigma, min, max) {
   //convert from uniform distribution (included in base js) to gaussian
   //http://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
   twoPi = 2 * Math.PI;
   var z1 = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(twoPi * Math.random());
   sample = z1 * sigma + mu;
   if (sample < min) {
      return min;
   } else if (sample > max) {
      return max
   } else {
      return sample
   }
}

///// init /////////////////////////////////////////////////////////////////////

function init() 
{
   console.log("Hi from init!");
   console.log("condition is " + INTER_REWARDS);
   var c = document.getElementById("myCanvas");
   //set people in lines
   for (i = 0; i < NUM_LINES; i++) {
      LINES.push(new Line(GAME_BOARD_Y + GAME_BOARD_HEIGHT / NUM_LINES * (i)));

      for (j = 0; j < lineLength[i]; j++) {
         LINES[i].addPerson(new Person(LINES[i].getNextXPos(), LINES[i].Y));
         console.log(LINES[i].Persons[j].X);
      }
   }

   // Set image files
   IMG_PERSON.src = "../static/images/stick_figure.jpg";
   IMG_PLAYER.src = "../static/images/stick_figure_red.jpg";

   // Set player location
   L = -1;
   PLAYER = new Player(PLAYER_START_X, (LINES[1].Y - LINES[0].Y) / 2 + LINES[0]
      .Y, L, -1);

   TicktockHandle = setInterval(ticktock, TICKTOCK_INTERVAL);
   eventClock = 0;
   masterClock = 0;
   serviceCountdown = 0;

   playerHorizontalMoveRequest = 0; // no requests to move player yet
   playerVerticalMoveRequest = 0;

   console.log("Bye from init!");
}

///// ticktock /////////////////////////////////////////////////////////////////

function ticktock()
{
   masterClock += TICKTOCK_INTERVAL;
   eventClock += TICKTOCK_INTERVAL;

   if (newEpisodeFlag) {
      newEpisode();
      newEpisodeFlag = 0;
   }

   if (eventClock >= EVENT_INTERVAL) {
      processPlayerMoveRequest(); // process player moves on event update
      eventClock = 0;
      console.log('New arrivals and departures');
      serviceCountdown = SERVICE_COUNTDOWN_INIT;
      leftGap = false; // did line advance leave a gap in front of player?
   }
   else if (serviceCountdown > 0) {
      animate();
      draw();
      --serviceCountdown;
   }

   if (masterClock > GAME_DURATION) {
      endGame();
   }
}
 
///// newEpisode ///////////////////////////////////////////////////////////////

function newEpisode() {
   REWARDING = true;
   console.log("Hi from set!");

   // Begin resetting board
   var c = document.getElementById("myCanvas");
   var ctx = c.getContext("2d");

   ctx.clearRect(0, 0, c.width, c.height); //Wipe the screen
   // Choose new line length for line 2
   lineLength = lineLengthNew;

   // Set people
   for (i = 0; i < NUM_LINES; i++) {
      LINES[i].Persons = []; //clear out the existing array
      for (j = 0; j < lineLength[i]; j++) {
         LINES[i].addPerson(new Person(LINES[i].getNextXPos(), LINES[i].Y));
         console.log(LINES[i].Persons[j].X);
      }
   }

   // Set PLAYER
   L = -1; //Player starts in neutral waiting area
   PLAYER = new Player(PLAYER_START_X, (LINES[1].Y - LINES[0].Y) / 2 + LINES[0]
      .Y, L, -1);
   playerSelectingLine = true;

   EpisodeNum += 1;
   EpisodeFlag = 0;
   serviceCountdown = 0;
   LINE_RECORD = [];
   TIME_RECORD = [];
   KEY_RECORD = [];

   REWARDING = false;
   rewardRecFlag = true;
   console.log("Bye from set");
}


///// reward ///////////////////////////////////////////////////////////////////

function reward(i) {
   console.log("Reward!");

   serviceCountdown = 0;
   LINES[i].Persons.shift();
   LINES[i].Persons.pop();

   REWARD = LINE_REWARDS[PLAYER.line];
   REWARD_TIC = 1;
   REWARD_RECORD = REWARD;
   CHA_CHING.play();

   newEpisodeFlag = 1; // reset board
}


///// processPlayerMoveRequest /////////////////////////////////////////////////

function processPlayerMoveRequest() {

   playerActed = false;
   action = "";

   if (playerHorizontalMoveRequest > 0 || PLAYER.position == 0) {
      playerActed = true;
      action = "Advance";
   }

   enteringLine = -1;
   if (playerVerticalMoveRequest < 0)
      enteringLine = 0;
   if (playerVerticalMoveRequest > 0)
      enteringLine = 1;

   if (enteringLine >= 0 && PLAYER.line != enteringLine) { // new line
      if (playerSelectingLine) {
	 action = "Selection";
	 playerSelectingLine = false;
      }
      else {
         action = "Switch";
	 // MIKE NEED TO DEAL WITH THE FACT THAT PLAYER IS REMOVED FROM LINE
      }
      playerActed = true;
      PLAYER.line = enteringLine;
      PLAYER.Y = LINES[PLAYER.line].Y;
      PLAYER.position = LINES[enteringLine].Persons.length;
      PLAYER.X = LINES[enteringLine].getNextXPos();
      LINES[enteringLine].addPerson(PLAYER);
   }

   playerVerticalMoveRequest = 0;
   playerHorizontalMoveRequest = 0;

   // MIKE: if there's an action, we want to record the event
}


///// animate //////////////////////////////////////////////////////////////////
//
// update positions if servicing is required 

function animate() 
{
   // loop over all lines and all persons in line and advance them
   // do not advance player if playerActed flag isn't set
   for (i=0; i<NUM_LINES; ++i) {
      for (j=0; j<LINES[i].Persons.length; ++j) {
         if (!LINES[i].Persons[j].PC || playerActed) {
	    LINES[i].Persons[j].X -= 1; // move to left
	    if (j == 0 && LINES[i].Persons[j].Y < LINES[i].Y + PERSON_Y_OFFSET) 
	       LINES[i].Persons[j].Y += 1; // front person moves down
	 }

      }
   }

   // player is in a line, didn't move, and we now need to jump around player
   if (serviceCountdown == Math.floor(SERVICE_COUNTDOWN_INIT/2) 
           && !playerActed && !playerSelectingLine) {
      // someone behind player? if so jump around player
      if (PLAYER.position < LINES[PLAYER.line].Persons.length - 1) {
	 LINES[PLAYER.line].Persons[PLAYER.position+1].X -= PERSON_X_SPACING;
         swapPositions(PLAYER.line, PLAYER.position, PLAYER.position+1);
      }
      else
         leftGap = true;
   }

   // if we're at the end of servicing the lines, remove the people who have
   // been serviced and add new people to the ends of the line
   
   if (serviceCountdown == 1) {
      // remove the people who have been serviced
      for (i=0; i<NUM_LINES; ++i) {
         if (LINES[i].Persons.length > 0)
	    LINES[i].Persons.shift();
      }

      // add new people to end of line if line is being extended;
      for (i=0; i<NUM_LINES; ++i) {
	 // requested change in line length 
         deltaLineLength = Math.max(0,lineLengthNew[i] - LINES[i].Persons.length);
	 // if the player is in this line and they left a gap, make sure
	 // at least one person is added
	 if (PLAYER.line == i && leftGap)
	    deltaLineLength = Math.max(1,deltaLineLength);
	 for (j=0; j<deltaLineLength; ++j) {
	    if (PLAYER.line == i && leftGap && j == 0) {
	       LINES[i].addPerson(new Person(PLAYER.X - PERSON_X_SPACING, LINES[i].Y));
	       swapPositions(i, PLAYER.position-1, PLAYER.position);
	    }
	    else {
	       LINES[i].addPerson(new Person(LINES[i].getNextXPos(), LINES[i].Y));
	    }
	 }
      }
      lineLength = lineLengthNew;

      if (PLAYER.position == 0) { // player is in reward position
         playerSelectingLine = true;
	 reward(PLAYER.line);
	 // MIKE show reward animation
	 // MIKE handle reward processing
      }
      else if (playerActed) {
         PLAYER.position --;
      }
   }
}


//         // If line has too many people and player is not in the line
//         if (LINES[i].Persons.length > lineLength[i] && (PLAYER.line != i ||
//               playerSelectingLine)) {
//            LINES[i].Persons.pop();
//         }

//   //Controls the reward animation at the top of the screen
//   if (REWARD_TIC > 0) {
//      REWARD_TIC += 1;
//      if (REWARD_TIC > 50) {
//         REWARD_TIC = 0;
//         PLAYER_SCORE += REWARD;
//         //      recordRewardData();
//         REWARD = 0;
//      }
//   }
//   //Controls the intermediate reward animation
//   if (INTER_REWARD_TIC > 0) {
//      INTER_REWARD_TIC += 1;
//      if (INTER_REWARD_TIC > 50 / 2) { // MIKE HACK FOR NOW
//         INTER_REWARD_TIC = 0;
//         PLAYER_SCORE += INTER_REWARD;
//         INTER_REWARD = 0;
//      }
//   }


//   //Walk through the lines and check if any of them is scheduled
//   // for a service event or an arrival
//   for (i = 0; i < NUM_LINES; i++) {
//
//      if (lineLength[i] == 0) {
//
//         if (playerSelectingLine) {
//            TIME_AT_ENTER = masterClock;
//
//         } else if (PLAYER.line == i && !playerSelectingLine) {
//            //stop animation
//            TIME_AT_REWARD = masterClock;
//
//            if (Defect_check) {
//               if ((TIME_AT_REWARD - TIME_CHANGE_LINE) > 950) {
//                  // DEBUG clearInterval(TicktockHandle);
//                  console.log("i= " + i);
//                  if (!REWARDING) {
//                     //Dont call more than once
//
//                     reward(i);
//
//
//                  }
//                  FlagLineChange = false;
//                  Defect_check = false;
//               }
//
//            } else {
//               if ((TIME_AT_REWARD - TIME_AT_ENTER) > 950) {
//                  // DEBUG clearInterval(TicktockHandle);
//                  console.log("i= " + i);
//                  if (!REWARDING) {
//                     //Dont call more than once
//
//                     reward(i);
//
//
//                  }
//               }
//            }
//         }
//      } 
//      else {
//         else if (LINES[i].isServicing && playerSelectingLine) {
//            // Player is selecting line
//            for (j = 0; j < LINES[i].Persons.length; j++) {
//               // move the persons to the left
//               LINES[i].Persons[j].X -= 1;
//            }
//            if (LINES[i].Persons[0].Y == LINES[i].Y + PERSON_Y_OFFSET) {
//               // if the first person is already shifted in the Y direction move in the X direction
//               LINES[i].Persons[0].X -= 1;
//            } else {
//               // shift the first person in the Y direction to show they are leaving
//               LINES[i].Persons[0].Y += 1;
//            }
//
//            if (LINES[i].getAtFront()) {
//               LINES[i].Persons.shift(); // remove person at front and shift others
//               LINES[i].isServicing = false; // line no longer servicing
//            }
//
//         }
//
//         //If a line needs to move up and the player is in it, then
//         // we need to only move the line up to the player
//         if (LINES[i].isServicing && PLAYER.line == i && !playerSelectingLine) {
//            if (PLAYER.position != 0) {
//               for (j = 0; j < PLAYER.position; j++) {
//                  LINES[i].Persons[j].X -= 1;
//               }
//               if (LINES[i].Persons[0].Y == LINES[i].Y + PERSON_Y_OFFSET) {
//                  LINES[i].Persons[0].X -= 1;
//               } else {
//                  LINES[i].Persons[0].Y += 1;
//               }
//               if (LINES[i].Persons[0].X < 22) {
//                  LINES[i].Persons.shift();
//                  PLAYER.position -= 1;
//                  LINES[i].isServicing = false;
//                  //recordLineData();
//                  console.log("Player pos");
//                  console.log(PLAYER.position);
//               }
//            } 
//            else if (PLAYER.position == 0 && PLAYER.X <= PERSON_FRONT_OF_LINE) {
//               //stop animation
//               TIME_AT_REWARD = masterClock;
//	       // DEBUG
//               //clearInterval(TicktockHandle);
//
//               if (!REWARDING) {
//                  //Dont call more than once
//                  reward(i);
//               }
//            }
//         }
//
//         //console.log(PLAYER.line);
//         //If player has pressed the left arrow and needs to be moved up
//         if (PLAYER_LEFT && PLAYER.position != -1 && PLAYER.position != 0) {
//            if ((LINES[PLAYER.line].Persons[PLAYER.position].X - LINES[PLAYER.line]
//                  .Persons[PLAYER.position - 1].X) > PERSON_X_SPACING && !LINES[
//                  i].isServicing) {
//               // if the player pushed left AND they are not in 0 position AND there is a space in front AND the line is not servicing
//               action = "Advance";
//               longLine = LINES[1].Persons.length;
//               positionInLine = PLAYER.position;
//               playerMoveLeft();
//            } else {
//               actions = "Trying to advance";
//            }
//         } else if (PLAYER_LEFT && PLAYER.position == 0 && PLAYER.X >=
//            PERSON_FRONT_OF_LINE && !LINES[i].isServicing) {
//            console.log("Last step!");
//            action = "Advance";
//            longLine = LINES[1].Persons.length;
//            positionInLine = PLAYER.position;
//            PLAYER.X = PERSON_FRONT_OF_LINE;
//            for (j = 1; j < LINES[PLAYER.line].Persons.length; j++) {
//               //loop through players line and shift x position of other people
//               LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j -
//                  1].X + PERSON_X_SPACING;
//            }
//            PLAYER_LEFT = false;
//         }
//
//         //If the player slacks off and doesn't move up
//         if ((PLAYER.position > 0) && 
//	      PLAYER.position <= (lineLength[PLAYER.line] - 1) && 
//	      !PLAYER_LEFT && ((LINES[PLAYER.line]
//               .Persons[PLAYER.position].X - LINES[PLAYER.line].Persons[
//                  PLAYER.position - 1].X) > PERSON_X_SPACING)) {
//            console.log("Slacking!");
//            slackingCheck = true;
//            //recordLineData()
//
//	    // DEBUG MIKE: an error occurs here 
//	    // cannot set property 'X' of undefined
//	    // error can occur after player defects and continues every
//	    // update until player is moved
//            LINES[PLAYER.line].Persons[PLAYER.position + 1].X = 
//	          LINES[PLAYER.line].Persons[PLAYER.position - 1].X + 
//		  PERSON_X_SPACING;
//            LINES[PLAYER.line].Persons[PLAYER.position] = 
//	          LINES[PLAYER.line].Persons[PLAYER.position + 1];
//            LINES[PLAYER.line].Persons[PLAYER.position + 1] = PLAYER;
//            PLAYER.position += 1;
//
//            for (j = PLAYER.position + 1; j < LINES[PLAYER.line].Persons.length; j++) {
//               LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j -
//                  1].X + PERSON_X_SPACING;
//            }
//         } else if (PLAYER.position == 0 && PLAYER.X > PERSON_FRONT_OF_LINE &&
//	    !PLAYER_LEFT) {
//            console.log("Slacking at the front!");
//            slackingCheck = true;
//            //recordLineData()
//            LINES[PLAYER.line].Persons[PLAYER.position + 1].X =
//               PERSON_FRONT_OF_LINE;
//            LINES[PLAYER.line].Persons[0] = LINES[PLAYER.line].Persons[1];
//            LINES[PLAYER.line].Persons[1] = PLAYER;
//            PLAYER.position = 1;
//            for (j = 2; j < LINES[PLAYER.line].Persons.length; j++) {
//               LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j -
//                  1].X + PERSON_X_SPACING;
//            }
//         } else if (PLAYER.line != -1) {
//            if (PLAYER.position == (LINES[PLAYER.line].Persons.length - 1) && 
//	       !PLAYER_LEFT) {
//               slackingCheck = true;
//               //            recordLineData()
//
//            }
//         }
//      }
//   } // end of for loop to check for service/arrival
//
//
//
//
//   //If the player has pressed the UP key and is intending to change lines
//   if (PLAYER_UP && PLAYER.line != 0 && PLAYER.line != -1 && !playerSelectingLine) {
//      Defect_check = true;
//      action = "Defect";
//      longLine = LINES[1].Persons.length;
//      positionInLine = PLAYER.position;
//      if (PLAYER.position != 0) {
//
//         LINES[PLAYER.line].Persons.splice(PLAYER.position, 1);
//         for (i = PLAYER.position; i < LINES[PLAYER.line].Persons.length; i++) {
//            //	       LINES[PLAYER.line].Persons[i].X = LINES[PLAYER.line].getNextXPos();
//            LINES[PLAYER.line].Persons[i].X = LINES[PLAYER.line].Persons[i - 1]
//               .X + PERSON_X_SPACING; // made change here- Shruthi
//         }
//      }
//      if (PLAYER.position == 0) {
//         LINES[PLAYER.line].Persons.shift();
//         LINES[PLAYER.line].Persons[0].X = PERSON_FRONT_OF_LINE;
//         for (j = 1; j < LINES[PLAYER.line].Persons.length; j++) {
//            //	       LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].getNextXPos();
//            LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j - 1]
//               .X + PERSON_X_SPACING;
//         }
//      }
//
//      PLAYER.line -= 1;
//
//      PLAYER.position = LINES[PLAYER.line].Persons.length;
//      PLAYER.X = LINES[PLAYER.line].getNextXPos();
//      PLAYER.Y = LINES[PLAYER.line].Y;
//      LINES[PLAYER.line].addPerson(PLAYER);
//      //recordLineData()
//      PLAYER_UP = false;
//   }
//   else if (PLAYER_UP && playerSelectingLine && PLAYER.line != 0 && PLAYER.line != -1) {
//      PLAYER.line -= 1;
//      PLAYER.Y = LINES[PLAYER.line].Y;
//      PLAYER_UP = false;
//   }
//
//
//
//   //If the player has pressed the down key and is intending to change lines
//   if (PLAYER_DOWN && PLAYER.line != LINES.length - 1 && !LINES[PLAYER.line + 1]
//      .isServicing && !playerSelectingLine) { // made a change here - Shruthi
//      action = "Defect";
//      longLine = LINES[1].Persons.length;
//      positionInLine = PLAYER.position;
//      //    if (PLAYER.position != 0) {
//      //      LINES[PLAYER.line].Persons.splice(PLAYER.position,1);
//      //      for (i = PLAYER.position;i<LINES[PLAYER.line].Persons.length;i++){
//      //	       LINES[PLAYER.line].Persons[i].X = LINES[PLAYER.line].Persons[i-1].X+ PERSON_X_SPACING;
//      //      }
//      //    }
//      if (PLAYER.position == 0) {
//         console.log("Line = " + PLAYER.line);
//         LINES[PLAYER.line].Persons.shift();
//         LINES[PLAYER.line].Persons[0].X = PERSON_FRONT_OF_LINE;
//         for (j = 1; j < LINES[PLAYER.line].Persons.length; j++) {
//            LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j - 1]
//               .X + PERSON_X_SPACING;
//         }
//      }
//
//      PLAYER.line += 1;
//
//      PLAYER.position = LINES[PLAYER.line].Persons.length;
//      PLAYER.X = LINES[PLAYER.line].Persons[PLAYER.position - 1].X +
//         PERSON_X_SPACING;
//      PLAYER.Y = LINES[PLAYER.line].Y;
//      LINES[PLAYER.line].addPerson(PLAYER);
//      //    recordLineData()
//      PLAYER_DOWN = false;
//   }
//   //If the player can't currently change lines because the destination line is in motion give some visual feedback that the button press was received
//   else if (PLAYER_DOWN && PLAYER.line != LINES.length - 1 && LINES[PLAYER.line +
//         1].isServicing && !playerSelectingLine) { // more changes made - Shruthi
//      PLAYER.Y += 1;
//   }
//   //If the player is in the waiting area, no need to check to see if destination line is in motion, so just go ahead and move the player
//   else if (PLAYER_DOWN && playerSelectingLine && PLAYER.line != LINES.length - 1 &&
//      PLAYER.line != -1) {
//
//      PLAYER.line += 1;
//      PLAYER.Y = LINES[PLAYER.line].Y;
//
//      PLAYER_DOWN = false;
//   }
//
//}


///// swapPositions ////////////////////////////////////////////////////////////

function swapPositions(i,p1,p2)
{
   console.log("in SwapPositions p1 PC " + LINES[i].Persons[p1].PC + " p2 PC "  + LINES[i].Persons[p2].PC);
   tmp = LINES[i].Persons[p2];
   LINES[i].Persons[p2] = LINES[i].Persons[p1];
   LINES[i].Persons[p1] = tmp;
}

///// draw /////////////////////////////////////////////////////////////////////
//
//Draws the current state of the game to the screen
function draw() {
   //console.log("Hi from draw!");
   var c = document.getElementById("myCanvas");
   var ctx = c.getContext("2d");

   // Positions of game board elements
   var y_score = SCORE_POS_Y;
   var y_boxes = GAME_BOARD_Y;
   var h_boxes = GAME_BOARD_HEIGHT;
   var w_boxes = 30;
   var y_ctrls = y_boxes + h_boxes + 30;
   var x_start = PLAYER_START_X;
   ctx.beginPath();
   ctx.clearRect(0, 0, c.width, c.height); //Wipe the screen
   ctx.fillStyle = "#000000";
   for (i = 0; i < NUM_LINES; i++) {
      ctx.font = "20px Georgia";
      ctx.fillText(LINE_REWARDS[i].toString(), 5, LINES[i].Y + 30);
      for (j = 0; j < LINES[i].Persons.length; j++) {
         if (LINES[i].Persons[j].PC) {
            ctx.drawImage(IMG_PLAYER, LINES[i].Persons[j].X, LINES[i].Persons[j]
               .Y + 10, 25, 25);
         } else {
            ctx.drawImage(IMG_PERSON, LINES[i].Persons[j].X, LINES[i].Persons[j]
               .Y + 10, 25, 25);
         }
      }
   }
   if (playerSelectingLine) {
      ctx.drawImage(IMG_PLAYER, PLAYER.X, PLAYER.Y + 10, 25, 25);
   }
   ctx.stroke();
   ctx.beginPath();
   ctx.font = "40px Georgia";
   ctx.fillStyle = "#000000";
   ctx.fillText("Score:", 5, y_score);
   ctx.fillText(PLAYER_SCORE.toString(), 140, y_score + 1);
   timeRemaining = Math.ceil((GAME_DURATION - masterClock)/1000);
   var totalNumberOfSeconds = timeRemaining;
   var hours = parseInt(totalNumberOfSeconds / 3600);
   var minutes = parseInt((totalNumberOfSeconds - (hours * 3600)) / 60);
   var seconds = Math.floor((totalNumberOfSeconds - ((hours * 3600) + (minutes *
      60))));

   ctx.font = "25px Georgia";
   ctx.fillText("Time Remaining:", x_start - 270, y_score - 2);
   ctx.font = "40px Georgia";
   ctx.fillText(minutes.toString() + ":" + (seconds < 10 ? "0" + seconds :
      seconds.toString()), x_start - 40, y_score + 1);
   ctx.font = "20px Georgia";
   ctx.fillText("Controls:", 5, y_ctrls);
   ctx.fillText("- Left Arrow - Enter queue, advance in the queue", 5, y_ctrls +
      20);
   ctx.fillText("- Up/Down arrow - select/switch queues", 5, y_ctrls + 40);
   if (INTER_REWARDS > 0) {
      ctx.fillText(
         "- The green point total you see after each move is a prediction of the",
         5, y_ctrls + 60)
      ctx.fillText(
         "  value of that move if you make it to the front of the line.", 5,
         y_ctrls + 80)
   }

   if ((REWARD_TIC > 0 && !INTER_REWARDS) || (REWARD_TIC > 0 && lineLength[
         LINE_REWARDS.indexOf(REWARD)] == 0)) {
      ctx.font = "160px Georgia";
      ctx.fillStyle = "#000000";
      ctx.fillText("+", x_start / 2 - 120, LINES[1].Y + 25);
      ctx.fillText(REWARD.toString(), x_start / 2 - 25, LINES[1].Y + 25);
      ctx.fillStyle = "#000000";
   }

   ctx.strokeStyle = "#000000";
   ctx.strokeRect(x_start, y_boxes - 25, w_boxes, h_boxes);
   ctx.strokeStyle = "#008080";
   ctx.strokeRect(54, y_boxes - 25, w_boxes, h_boxes);
   ctx.stroke();
   ctx.beginPath();
   for (i = 0; i < NUM_LINES; i++) {
      // make slots in the waiting area
      ctx.clearRect(x_start - 5, LINES[i].Y + 10, 10, 30);
   }

   // Animate the hint message
   lv1 = 0;
   lv2 = 2.5;
   lv3 = 5;
   if (INTER_REWARD_TIC > lv1 && INTER_REWARD_TIC < lv2) {
      // small text for inter-reward
      ctx.font = "20px Georgia";
      ctx.fillStyle = "#008000";
      ctx.fillText("+", PLAYER.X + 20, PLAYER.Y - 15);
      ctx.fillText(INTER_REWARD.toString(), PLAYER.X + 28, PLAYER.Y - 15);
      ctx.fillStyle = "#000000";
   }
   if (INTER_REWARD_TIC >= lv2 && INTER_REWARD_TIC < lv3) {
      //bigger text for inter reward
      ctx.font = "35px Georgia";
      ctx.fillStyle = "#008000";
      ctx.fillText("+", PLAYER.X + 20, PLAYER.Y - 15);
      ctx.fillText(INTER_REWARD.toString(), PLAYER.X + 45, PLAYER.Y - 15);
      ctx.fillStyle = "#000000";
   }
   if (INTER_REWARD_TIC >= lv3) {
      //bigger text for inter reward
      ctx.font = "50px Georgia";
      ctx.fillStyle = "#008000";
      ctx.fillText("+", PLAYER.X + 20, PLAYER.Y - 15);
      ctx.fillText(INTER_REWARD.toString(), PLAYER.X + 45, PLAYER.Y - 15);
      ctx.fillStyle = "#000000";
   }
   ctx.stroke();
}


///// playerMoveLeft ///////////////////////////////////////////////////////////
//
// Moves the player up in the line if possible
// This needs to be a seperate function so that a micro-delay
// can be built-in to it's execution to stop the 'move a few pixels'
// bug that occurs when trying to move while the line is in motion
function playerMoveLeft() {
   if (!LINES[PLAYER.line].isServicing) {
      for (j = PLAYER.position; j < LINES[PLAYER.line].Persons.length; j++) {
         LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j - 1].X +
            PERSON_X_SPACING;
      }
      if (INTER_REWARDS) {
         INTER_REWARD_TIC = 1;
         INTER_REWARD = Math.round(LINE_REWARDS[PLAYER.line] / lineLength[
            PLAYER.line]);
      }
      console.log('inter rwd ' + INTER_REWARD)
      PLAYER_LEFT = false;
   }
}


///// endInstructions //////////////////////////////////////////////////////////

function endInstructions() {
   if (GAME_STARTED == 0) {
      //Close out the pisturk instructions
      psiTurk.finishInstructions();
      // Load the stage.html snippet into the body of the page, the stage.html has "myCanvas"
      psiTurk.showPage('stage.html');

      var c = document.getElementById("myCanvas");
      var ctx = c.getContext("2d");
      ctx.clearRect(0, 0, c.width, c.height); //Wipe the screen
      GAME_STARTED = 1;
      init();
      bufferKeystroke(true);
   }
}


///// bufferKeystroke //////////////////////////////////////////////////////////
//
// Detect button presses and save for next update

function bufferKeystroke(evt) {
   console.log("Hey from key detect!");
   logKeystroke();

   if (evt.keyCode == 37)  // left arrow
      playerHorizontalMoveRequest += 1;
   else if (evt.keyCode == 38)  // up arrow
      playerVerticalMoveRequest -= 1;
   else if (evt.keyCode == 40)  // down arrow 
      playerVerticalMoveRequest += 1;
}

///// logKeystroke /////////////////////////////////////////////////////////////

function logKeystroke() {
   var data = new Object();
   data.action = action; //to be defined
   data.longLine = longLine;
   data.lineNo = PLAYER.line;
   data.positionInLine = positionInLine;
   data.slackCheck = slackingCheck;
   data.episodeFlag = EpisodeFlag; //to be defined
   data.timeRemaining = masterClock;

   if (rewardRecFlag == true) {
      data.reward = REWARD_RECORD;
      rewardRecFlag = false;
   } else {
      data.reward = 0;
   }
   Data = JSON.stringify(data);
   console.log(Data);
   psiTurk.recordTrialData(Data);
}



///// endGame //////////////////////////////////////////////////////////////////

function endGame() {

   clearTimeout(TicktockHandle);  // stop refreshes

   //  line_record = JSON.stringify(LINE_RECORD);
   //  pos_record = JSON.stringify(POS_RECORD);
   //  time_record = JSON.stringify(TIME_RECORD);
   //  reward_record = JSON.stringify(REWARD_RECORD);
   //  key_record = JSON.stringify(KEY_RECORD);
   //  key_time_record = JSON.stringify(KEY_TIME_RECORD);
   player_score = PLAYER_SCORE;
   logKeystroke();

   //Display "saving" on the board
   var c = document.getElementById("myCanvas");
   var ctx = c.getContext("2d");
   ctx.clearRect(0, 0, c.width, c.height); //Wipe the screen

   ctx.font = "40px Georgia";
   ctx.fillStyle = "#008000";
   ctx.fillText("Saving Data...", 230, 125);

   ctx.stroke();
   // write data
   //  psiTurk.recordTrialData({'phase':"GAME",
   //				    'lines':line_record,
   //		    'positions':pos_record,
   //				    'linetimes':time_record,
   //				    'keys':key_record,
   //				    'keytimes':key_time_record,
   //				    'rewards':reward_record,
   //				    'Score':player_score,
   //                    'Episode Data':episode_record}
   //				  );
   // save data to server, compute bonus
   psiTurk.recordTrialData({
      'Score': player_score
   });
   console.log('quitting')
   save2Server();
};

function save2Server() {
   console.log('saving to server')
   psiTurk.saveData({
      success: function() {
         // function to run if the data is saved
         console.log('save successful');
         psiTurk.computeBonus('compute_bonus', function() {
            console.log('computed bonus')
            psiTurk.completeHIT();
         });
      }
   });

   //done for git commit
   //in case of failure call back
   setTimeout(save2Server, 3000);
};
//Add a key detector to allow for interaction
window.addEventListener('keydown', bufferKeystroke, true);

// Task object to keep track of the current phase
var currentview;

/*******************
 * Run Task
 ******************/
$(window).load(function() {
   psiTurk.doInstructions(
      instructionPages, // a list of pages you want to display in sequence
      function() {
         endInstructions()
      } // what you want to do when you are done with instructions
   );
});
