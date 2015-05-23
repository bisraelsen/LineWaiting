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
var PLAYER_SCORE = 0;	//Keeps track of the players score
var NUM_LINES = 2;	//Change to add more lines to the program 3 works well, I think
var LINES = [];		//This is an array that will be used to keep track of all the persons in each line
var LINE_REWARDS = [1, 12];	//This sets the reward for each line. If you increase the NUM_LINES, add additional entries here
var LINE_LENGTHS = [0, 12];	//This sets the length of each line. If you increase the NUM_LINES, add additional entries here
///These control the intermediate reward function
var INTER_REWARDS = false;	//Set this to true if you want the estimate intermediate reward to display, false if you don't
var INTER_REWARD = 0;
var INTER_REWARD_TIC = 0;
var TIC = 0;
var REWARD_TIC = 0;
var REWARD = 0;
var PLAYER;
var SELECTING = true; // indicates whether the player is in the line selection area
var PLAYER_LEFT = false;
var PLAYER_START_X = 680;
var PERSON_X_SPACING = 30; // X distance between people in lines
var PERSON_Y_OFFSET = 20; // distance to offset in Y direction when servicing
var PERSON_FRONT_OF_LINE = 60; //X location of the front of the line
var GAME_BOARD_HEIGHT = 200;
var SCORE_POS_Y = 40;
var GAME_BOARD_Y = SCORE_POS_Y + 50;
var CHA_CHING = new Audio('../static/media/Cha-Ching.m4a');
var IMG_PERSON = new Image();
var IMG_PLAYER = new Image();
var ARRIVE = []; // array to store when people should be added to lines
var SERVICE = []; // array to store when people should exit lines
var ANIMATE_INTERVAL = 20; //rate at which the animate function is called in ms
var INTERVAL = 50;// INTERVAL * ANIMATE_INTERVAL is the rate at which lines advance
var INTERVAL_SFT = 30;//shift to the INTERVAL for random assignment of line advancement
var PLAYER_UP = false;
var PLAYER_DOWN = false;
var START_TIME = 0;
var TIME_REMAINING = 100.000;//un-rounded time remaining (milliseconds)
var TIME_REMAINING_RND = 100;//integer time remaining for display
var TIME = 300; // experiment duration in seconds
var EpisodeNum = 1;
var EpisodeRecord = {};
var LONG_LINE_RECORD =[];
var LINE_RECORD = [];
var POS_RECORD =[];
var TIME_RECORD = [];
var REWARD_RECORD = [];
var REWARDING = false; //tracks when player is being rewarded
var KEY_RECORD = [];//record for all game move key strokes
var KEY_TIME_RECORD = [];//associated time for all key strokes
var SENT = 0;
var GAME_STARTED = 0;
var AnimateHandle; //will hold the Interval handle so animate can be stopped when code is finishing
var DrawHandle;
var save2ServerHandle; //handle for the save2Server that will be called until it is successful
var TIME_AT_REWARD = 300*1000;
var TIME_AT_ENTER;
var TIME_AT_SELECT; 
var TIME_CHANGE_LINE;
var FlagLineChange=false;
var timeAtRew = TIME_AT_REWARD;
var SLACKING_RECORD=[];
var Slacking_check = false;
var DEFECT_RECORD = [];
var Defect_check = false;
var LINE_LENGTHS_NEW = Math.round(drawGaussianSample(12,3,7,17));
var tstWOInstructions = false; //for testing and skipping instructions

//Randomly decide between having intermediate rewards on or off
if (Math.round(Math.random()) == 0){
  INTER_REWARDS = false;
  //INTER_REWARDS = true;
  //console.log("condition is " + INTER_REWARDS);
}
else{
  INTER_REWARDS = true;
  //console.log("condittion is " + INTER_REWARDS);
}
//force condition to get balanced data
INTER_REWARDS = false;
// set condition in database
psiTurk.taskdata.set('cond',INTER_REWARDS)

var mycounterbalance = counterbalance;  // they tell you which condition you have been assigned to
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
"stage.html"
];

psiTurk.preloadPages(pages);

//change last page based on the experimental condition
if (!tstWOInstructions)
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
  else{
    var instructionPages = []; //want to run without instructions
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
function Person(X,Y) {
  this.X = X;
  this.Y = Y;
  this.PC = false;
}
//Player is a subclass of Person that represents the player character
function Player(X,Y,line,position) {
  this.X = X;
  this.Y = Y;
  this.line = line;
  this.position = position;
  this.PC = true;
}
//Defining the inheritance
Player.prototype = new Person(0,0);

//A Line object is made for each of the lines that appears on
// screen. It keeps track of what operations the line is currently
// undergoing (arrival, service)
function Line(Y) {
  this.Y = Y;
  this.Persons = [];
  this.isArriving = false;
  this.isServicing = false;
}
//This function adds a person to a line
Line.prototype.addPerson = function(P) {
  this.Persons.push(P);
}

Line.prototype.add2people = function(P1,P2){
    this.Persons.push(P1,P2);
}
//This function gets the x position to add a new figure
Line.prototype.getNextXPos = function(){
  if (this.Persons.length == 0) {
    // no body in the line
    xpos = PERSON_FRONT_OF_LINE;
  } else {
    xpos = this.Persons[this.Persons.length-1].X + PERSON_X_SPACING;
  }

  return xpos;
}

Line.prototype.getAtFront = function(){
  // If the line only has one person
  if(typeof LINES[i].Persons[1] == 'undefined'){
    if (LINES[i].Persons[0].X <= PERSON_FRONT_OF_LINE){
      return true;
    }
  } else if(LINES[i].Persons[1].X <= PERSON_FRONT_OF_LINE) {
    return true;
  }
  return false;
}

function drawGaussianSample(mu,sigma,min,max){
  //convert from uniform distribution (included in base js) to gaussian
  //http://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
  twoPi = 2* Math.PI;
  var z1 = Math.sqrt(-2*Math.log(Math.random()))*Math.cos(twoPi*Math.random());
  sample = z1 * sigma + mu;
  if (sample < min){
    return min;
  } else if (sample > max) {
    return max
  } else {
    return sample
  }
}

/////
///// FUNCTIONS
/////

//The init function to set everything up before the game gets started
function init() {
  START_TIME = Math.round(new Date().getTime());
  console.log("Hi from init!");
  console.log("condition is " + INTER_REWARDS);
  var c = document.getElementById("myCanvas");
 
  //set people in lines
  for (i=0;i<NUM_LINES;i++) {
    LINES.push(new Line(GAME_BOARD_Y + GAME_BOARD_HEIGHT/NUM_LINES*(i)));
    //ARRIVE.push(Math.round(drawGaussianSample(INTERVAL-INTERVAL_SFT,INTERVAL_SFT,0,INTERVAL)));
    //SERVICE.push(Math.round(drawGaussianSample(INTERVAL-INTERVAL_SFT,INTERVAL_SFT,0,INTERVAL)));
    ARRIVE.push(INTERVAL);
    SERVICE.push(INTERVAL);
      
    for (j=0;j<LINE_LENGTHS[i];j++) {
      LINES[i].addPerson(new Person(LINES[i].getNextXPos(),LINES[i].Y));
      console.log(LINES[i].Persons[j].X);
    }
  }

  // Set image files
  IMG_PERSON.src = "../static/images/stick_figure.jpg";
  IMG_PLAYER.src = "../static/images/stick_figure_red.jpg";

  // Set player location
  L = - 1;
  PLAYER = new Player(PLAYER_START_X,(LINES[1].Y - LINES[0].Y)/2 + LINES[0].Y,L,-1);


  startAnimation();

  console.log("Bye from init!");
}

function startAnimation(){
  AnimateHandle = setInterval(animate,ANIMATE_INTERVAL);
  DrawHandle = setInterval(draw,ANIMATE_INTERVAL);
}

function setPieces(){
  REWARDING = true;
  console.log("Hi from set!");
    
    // Begin resetting board
  var c = document.getElementById("myCanvas");
  var ctx = c.getContext("2d");

  ctx.clearRect(0,0,c.width,c.height); //Wipe the screen
  // Choose new line length for line 2
//  LINE_LENGTHS[1] = 14;//LINE_LENGTHS_NEW;
  var M = 3;

    if (LINE_LENGTHS[1] != LINE_LENGTHS_NEW){
        LINE_LENGTHS[1] = LINES[1].Persons.length + Math.max(-M,Math.min(M, (LINE_LENGTHS_NEW-LINES[1].Persons.length)));
    }

  LINE_LENGTHS_NEW = Math.round(drawGaussianSample(12,4,6,16));
  // Set people
  for (i=0;i<NUM_LINES;i++) {
    LINES[i].Persons = []; //clear out the existing array
    for (j=0;j<LINE_LENGTHS[i];j++) {
      LINES[i].addPerson(new Person(LINES[i].getNextXPos(),LINES[i].Y));
      console.log(LINES[i].Persons[j].X);
    }
  }

  // Set PLAYER
  L = - 1; //Player starts in neutral waiting area
  PLAYER = new Player(PLAYER_START_X,(LINES[1].Y - LINES[0].Y)/2 + LINES[0].Y,L,-1);
  SELECTING = true;

  TIC = 0;

  var entry = {'LINES':LINE_RECORD, 'POSITIONS':POS_RECORD, 'TIMES':TIME_RECORD, "KEYS":KEY_RECORD, "LONG LINE":LONG_LINE_RECORD, "SLACKING" : Slacking_check, "DEFECT" :Defect_check};

  EpisodeRecord[EpisodeNum] = entry;

  EpisodeNum += 1;

  // Clear out arrays
  LINE_RECORD = [];
  POS_RECORD = [];
  TIME_RECORD = [];
  KEY_RECORD = [];

  setTimeout(startAnimation,10);
  REWARDING = false;
  console.log("Bye from set");
}

function reward(i) {
  console.log("Reward!");
  
  // Record when Reward happened
    
   
  console.log("It takes so long to finish a loop: "+(TIME_AT_SELECT-TIME_AT_REWARD));  
//  if ((TIME_AT_SELECT - TIME_AT_REWARD) > 1000){   
  LINES[i].isServicing = false;
  LINES[i].Persons.shift();
  LINES[i].Persons.pop();

  REWARD = LINE_REWARDS[PLAYER.line];
  REWARD_TIC = 1;
  CHA_CHING.play();
//  }
  // reset board
  setPieces();
}

//Draws the current state of the game to the screen
function draw(){
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
  ctx.clearRect(0,0,c.width,c.height); //Wipe the screen
  ctx.fillStyle="#000000";
  for (i=0;i<NUM_LINES;i++){
    ctx.font="20px Georgia";
    ctx.fillText(LINE_REWARDS[i].toString(),5,LINES[i].Y+30);
    for (j=0;j<LINES[i].Persons.length;j++){
      if (LINES[i].Persons[j].PC){
	ctx.drawImage(IMG_PLAYER,LINES[i].Persons[j].X,LINES[i].Persons[j].Y + 10,25,25);
      } else {
	ctx.drawImage(IMG_PERSON,LINES[i].Persons[j].X,LINES[i].Persons[j].Y + 10,25,25);
      }
    }
  }
  if (SELECTING) {
    ctx.drawImage(IMG_PLAYER,PLAYER.X,PLAYER.Y + 10,25,25);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.font="40px Georgia";
  ctx.fillStyle ="#000000";
  ctx.fillText("Score:",5,y_score);
  ctx.fillText(PLAYER_SCORE.toString(),140,y_score+1);
  getTime();
  TIME_REMAINING_RND = Math.round(TIME_REMAINING/1000);
  var totalNumberOfSeconds = TIME_REMAINING_RND;
  var hours = parseInt( totalNumberOfSeconds / 3600 );
  var minutes = parseInt( (totalNumberOfSeconds - (hours * 3600)) / 60 );
  var seconds = Math.floor((totalNumberOfSeconds - ((hours * 3600) + (minutes * 60))));
  
  ctx.font="25px Georgia";
  ctx.fillText("Time Remaining:",x_start-270,y_score-2);
  ctx.font="40px Georgia";
  ctx.fillText(minutes.toString() + ":" + (seconds  < 10 ? "0" + seconds : seconds.toString()) ,x_start-40,y_score+1);
  ctx.font="20px Georgia";
  ctx.fillText("Controls:",5,y_ctrls);
  ctx.fillText("- Left Arrow - Enter line, advance in the line",5,y_ctrls+20);
  ctx.fillText("- Up/Down arrow - select/switch lines",5,y_ctrls+40);
  if (INTER_REWARDS > 0){
    ctx.fillText("- The green point total you see after each move is a prediction of the",5,y_ctrls+60)
    ctx.fillText("  value of that move if you make it to the front of the line.",5,y_ctrls+80)
  }

  if ((REWARD_TIC > 0 && !INTER_REWARDS) || (REWARD_TIC > 0 && LINE_LENGTHS[LINE_REWARDS.indexOf(REWARD)] == 0)){
    ctx.font="160px Georgia";
    ctx.fillStyle="#000000";
    ctx.fillText("+",x_start/2 - 120,LINES[1].Y+25);
    ctx.fillText(REWARD.toString(),x_start/2-25,LINES[1].Y+25);
    ctx.fillStyle ="#000000";
  }

  ctx.strokeStyle="#000000";
  ctx.strokeRect(x_start,y_boxes-25,w_boxes,h_boxes);
  ctx.strokeStyle="#008080";
  ctx.strokeRect(54,y_boxes-25,w_boxes,h_boxes);
  ctx.stroke();
  ctx.beginPath();
  for (i=0;i<NUM_LINES;i++){
    // make slots in the waiting area
    ctx.clearRect(x_start-5,LINES[i].Y+10,10,30);
  }

  // Animate the hint message
  lv1 = 0;
  lv2 = 2.5;
  lv3 = 5;
  if (INTER_REWARD_TIC > lv1 && INTER_REWARD_TIC < lv2) {
    // small text for inter-reward
    ctx.font="20px Georgia";
    ctx.fillStyle = "#008000";
    ctx.fillText("+",PLAYER.X + 20,PLAYER.Y - 15);
    ctx.fillText(INTER_REWARD.toString(),PLAYER.X + 28,PLAYER.Y - 15);
    ctx.fillStyle ="#000000";
  }
  if (INTER_REWARD_TIC >= lv2 && INTER_REWARD_TIC < lv3) {
    //bigger text for inter reward
    ctx.font="35px Georgia";
    ctx.fillStyle = "#008000";
    ctx.fillText("+",PLAYER.X + 20,PLAYER.Y - 15);
    ctx.fillText(INTER_REWARD.toString(),PLAYER.X + 45,PLAYER.Y - 15);
    ctx.fillStyle ="#000000";
  }
  if (INTER_REWARD_TIC >= lv3) {
    //bigger text for inter reward
    ctx.font="50px Georgia";
    ctx.fillStyle = "#008000";
    ctx.fillText("+",PLAYER.X + 20,PLAYER.Y - 15);
    ctx.fillText(INTER_REWARD.toString(),PLAYER.X + 45,PLAYER.Y - 15);
    ctx.fillStyle ="#000000";
  }
  ctx.stroke();

 // end of draw
}

//Update the time calculation
function getTime(){
  TIME_REMAINING = TIME*1000 - (new Date().getTime()- START_TIME);
}

//For recording line history data
function recordRewardData(){
  REWARD_RECORD.push(REWARD);
  getTime();
  REWARD_RECORD.push(TIME_REMAINING);
  console.log(REWARD_RECORD);
};

//For recording line history data
function recordLineData(){
  LINE_RECORD.push(PLAYER.line);
  POS_RECORD.push(PLAYER.position);
  getTime();
  TIME_RECORD.push(TIME_REMAINING);
  console.log(LINE_RECORD);
  console.log(POS_RECORD);
};

function recordLongLine(){
    LONG_LINE_RECORD.push(LINES[1].Persons.length);
    console.log(LONG_LINE_RECORD);
};


//For recording key stroke history
function recordKeyData(stroke){
  KEY_RECORD.push(stroke);
  getTime();
  KEY_TIME_RECORD.push(TIME_REMAINING);
  //console.log(LINE_RECORD);
};

//This is called repeatedly to update the state of the game and
// animate the lines
function animate(){
  //console.log("Hi from animate")
  TIC = TIC + 1;			//Update the TIC global var to keep time
  //Reset count when the interval (set in global vars) has passed
  if (TIC > INTERVAL) {
    TIC = 0;
    for (i=0;i<NUM_LINES;i++){
      // If line needs another person and player is not in the line
      if (LINES[i].Persons.length < LINE_LENGTHS[i] && (PLAYER.line != i || SELECTING)) {
	       LINES[i].addPerson(new Person(LINES[i].getNextXPos(),LINES[i].Y));
      }
      // If line has too many people and player is not in the line
      if (LINES[i].Persons.length > LINE_LENGTHS[i] && (PLAYER.line != i || SELECTING)) {
	       LINES[i].Persons.pop();
      }
    }
  }

  //Controls the reward animation at the top of the screen
  if (REWARD_TIC > 0){
    REWARD_TIC += 1;
    if (REWARD_TIC > 50){
      REWARD_TIC = 0;
      PLAYER_SCORE += REWARD;
      recordRewardData();
      REWARD = 0;
    }
  }
  //Controls the intermediate reward animation
  if (INTER_REWARD_TIC > 0) {
    INTER_REWARD_TIC += 1;
    if (INTER_REWARD_TIC > INTERVAL/2){
      INTER_REWARD_TIC = 0;
      PLAYER_SCORE += INTER_REWARD;
      INTER_REWARD = 0;
    }
  }

  //Walk through the lines and check if any of them is scheduled
  // for a service event or an arrival
  for (i=0;i<NUM_LINES;i++){
  
        if (LINE_LENGTHS[i] == 0) {
        
          if (SELECTING){
              TIME_AT_ENTER = TIME*1000 -(Math.round(new Date().getTime() - START_TIME));
              
          }
          else if (PLAYER.line == i && !SELECTING) {
            //stop animation
              TIME_AT_REWARD = TIME*1000 -(Math.round(new Date().getTime() - START_TIME)); 

              if(FlagLineChange){
                  if ((TIME_CHANGE_LINE-TIME_AT_REWARD)>1000){  
                    clearInterval(AnimateHandle);
                    clearInterval(DrawHandle);
                       console.log("i= "+i);
                    if (!REWARDING){
                      //Dont call more than once
    
                        reward(i);
    
    
                      }
                      FlagLineChange=false;
                      Defect_check = false;
                  }
                  
              }
            else{
                if ((TIME_AT_ENTER-TIME_AT_REWARD) >1000){  
                clearInterval(AnimateHandle);
                clearInterval(DrawHandle);
                   console.log("i= "+i);
                if (!REWARDING){
                  //Dont call more than once

                    reward(i);


              }
            }
          }
      }
        
        
    } else {

      if ( ARRIVE[i] == TIC){
        // time for someone to be added

       if(i==1){

//         if (!Slacking_check){
             console.log('Are you here :( ');
            if (LINE_LENGTHS_NEW == LINE_LENGTHS[i]){
                LINES[i].addPerson(new Person(LINES[i].getNextXPos(),LINES[i].Y));
            }
            else if (LINE_LENGTHS_NEW > LINE_LENGTHS[i]){
                console.log("Next length is bigger!!");
                if (LINES[i].Persons.length < LINE_LENGTHS_NEW){
                LINES[i].add2people(new Person(LINES[i].getNextXPos(),LINES[i].Y), new Person(LINES[i].getNextXPos() + PERSON_X_SPACING , LINES[i].Y) );
                }
                else {
                    LINES[i].addPerson(new Person(LINES[i].getNextXPos(),LINES[i].Y));
                }
            }
            else{
                console.log('Are you here ');
                if (LINES[i].Persons.length <= LINE_LENGTHS_NEW || Slacking_check){
                    LINES[i].addPerson(new Person(LINES[i].getNextXPos(),LINES[i].Y));
                }
            }
//         }
//         else  {
//             console.log('Are you here yay');
//             console.log("Line Length" + LINES[i].Persons.length);
//              LINES[i].addPerson(new Person(LINES[i].Persons[LINES[i].Persons.length-1].X+PERSON_X_SPACING,LINES[i].Y));
//
//          }
        }
        else {
              LINES[i].addPerson(new Person(LINES[i].getNextXPos(),LINES[i].Y));
        }

      }

      if ( SERVICE[i] == TIC){
        // time for someone to exit the line
        LINES[i].isServicing = true;
      }

      //If a line needs to move up and the player is not in it
      // simply move up the entire line
      if(LINES[i].isServicing && !SELECTING && PLAYER.line != i){
        // Player not selecting, but not in LINES[i]
        for(j=0;j<LINES[i].Persons.length;j++) {
          // move the persons to the left
  	       LINES[i].Persons[j].X -= 1;
        }
        if (LINES[i].Persons[0].Y == LINES[i].Y + PERSON_Y_OFFSET) {
           // if the person is already shifted in the Y direction move in the X direction
  	       LINES[i].Persons[0].X -= 1;
        } else {
           // shift the first person in the Y direction to show they are leaving
  	       LINES[i].Persons[0].Y += 1;
        }
        if(LINES[i].getAtFront()) {
           // remove person at position 0 and shift everything left
  	       LINES[i].Persons.shift();

           // line no longer servicing
  	       LINES[i].isServicing = false;
        }
      } else if (LINES[i].isServicing && SELECTING) {
        // Player is selecting line
        for(j=0;j<LINES[i].Persons.length;j++) {
          // move the persons to the left
  	       LINES[i].Persons[j].X -= 1;
        }
        if (LINES[i].Persons[0].Y == LINES[i].Y + PERSON_Y_OFFSET) {
          // if the first person is already shifted in the Y direction move in the X direction
  	       LINES[i].Persons[0].X -= 1;
        } else {
          // shift the first person in the Y direction to show they are leaving
  	       LINES[i].Persons[0].Y += 1;
        }

        if(LINES[i].getAtFront()) {
          // remove person at position 0 and shift everything left
          LINES[i].Persons.shift();
          // line no longer servicing
          LINES[i].isServicing = false;
        }

      }

      //If a line needs to move up and the player is in it, then
      // we need to only move the line up to the player
      if(LINES[i].isServicing && PLAYER.line == i && !SELECTING) {
        if (PLAYER.position != 0) {
        	for(j=0;j<PLAYER.position;j++) {
        	  LINES[i].Persons[j].X -= 1;
        	}
        	if (LINES[i].Persons[0].Y == LINES[i].Y + PERSON_Y_OFFSET) {
        	  LINES[i].Persons[0].X -= 1;
        	} else {
        	  LINES[i].Persons[0].Y += 1;
        	}
        	if(LINES[i].Persons[0].X < 22) {
        	  LINES[i].Persons.shift();
        	  PLAYER.position -= 1;
        	  LINES[i].isServicing = false;
        	  recordLineData();
        	  console.log("Player pos");
        	  console.log(PLAYER.position);
        	}
        } else if (PLAYER.position == 0 && PLAYER.X <= PERSON_FRONT_OF_LINE) {
          //stop animation
          TIME_AT_REWARD = TIME*1000 -(Math.round(new Date().getTime() - START_TIME));    
          clearInterval(AnimateHandle);
          clearInterval(DrawHandle);
             
          if (!REWARDING){
            //Dont call more than once
            reward(i);
          }
        }
      }

//    if (PLAYER.line != -1){
        console.log(PLAYER.line);
      //If player has pressed the left arrow and needs to be moved up
      if(PLAYER_LEFT && PLAYER.position != -1 && PLAYER.position != 0) {
          console.log(PLAYER.position);
//          if (PLAYER.line == 0){
//              TIME_AT_ENTER = TIME*1000 - Math.round((new Date().getTime() - START_TIME));
//          }
          if((LINES[PLAYER.line].Persons[PLAYER.position].X - LINES[PLAYER.line].Persons[PLAYER.position-1].X) > PERSON_X_SPACING && !LINES[i].isServicing) {
            // if the player pushed left AND they are not in 0 position AND there is a space in front AND the line is not servicing
            playerMoveLeft();
          }
      } else if(PLAYER_LEFT && PLAYER.position == 0 && PLAYER.X >= PERSON_FRONT_OF_LINE && !LINES[i].isServicing) {
        console.log("Last step!");
        PLAYER.X = PERSON_FRONT_OF_LINE;
        for(j=1;j<LINES[PLAYER.line].Persons.length;j++) {
          //loop through players line and shift x position of other people
  	      LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j-1].X + PERSON_X_SPACING;
        }
      }

      //If the player slacks off and doesn't move up
      if((PLAYER.position > 0) && TIC > (INTERVAL - 5) && PLAYER.position < (LINES[PLAYER.line].Persons.length-1) && !PLAYER_LEFT && ((LINES[PLAYER.line].Persons[PLAYER.position].X - LINES[PLAYER.line].Persons[PLAYER.position-1].X) > 35)) {
        console.log("Slacking!");
          Slacking_check  = true;
        recordLineData()

        LINES[PLAYER.line].Persons[PLAYER.position + 1].X = LINES[PLAYER.line].Persons[PLAYER.position - 1].X + PERSON_X_SPACING;
        LINES[PLAYER.line].Persons[PLAYER.position] = LINES[PLAYER.line].Persons[PLAYER.position + 1];
        LINES[PLAYER.line].Persons[PLAYER.position + 1] = PLAYER;
        PLAYER.position += 1;

        for(j=PLAYER.position+1;j<LINES[PLAYER.line].Persons.length;j++) {
  	       LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j-1].X + PERSON_X_SPACING;
        }
      } else if (PLAYER.position == 0 && PLAYER.X > PERSON_FRONT_OF_LINE && TIC > (INTERVAL - 5) && !PLAYER_LEFT) {
        console.log("Slacking at the front!");
          Slacking_check  = true;
        recordLineData()
        LINES[PLAYER.line].Persons[PLAYER.position + 1].X = PERSON_FRONT_OF_LINE;
        LINES[PLAYER.line].Persons[0] = LINES[PLAYER.line].Persons[1];
        LINES[PLAYER.line].Persons[1] = PLAYER;
        PLAYER.position = 1;
        for(j=2;j<LINES[PLAYER.line].Persons.length;j++) {
  	       LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j-1].X+PERSON_X_SPACING;
        }
      }
       else if(PLAYER.line != -1){
           if (PLAYER.position == (LINES[PLAYER.line].Persons.length-1) && !PLAYER_LEFT && TIC > (INTERVAL - 5)){
            Slacking_check = true;
            recordLineData()

       }
       }
    }
//    }
  } // end of for loop to check for service/arrival

  //If the player has pressed the UP key and is intending to change lines
  if (PLAYER_UP && PLAYER.line != 0 && PLAYER.line != -1 && !LINES[PLAYER.line-1].isServicing && !SELECTING) {
   Defect_check = true;
    if (PLAYER.position != 0) {
        
      LINES[PLAYER.line].Persons.splice(PLAYER.position,1);
      for (i = PLAYER.position;i<LINES[PLAYER.line].Persons.length;i++){
//	       LINES[PLAYER.line].Persons[i].X = LINES[PLAYER.line].getNextXPos();
      LINES[PLAYER.line].Persons[i].X = LINES[PLAYER.line].Persons[i-1].X + PERSON_X_SPACING;  // made change here- Shruthi
      }
    }
    if (PLAYER.position == 0) {
      LINES[PLAYER.line].Persons.shift();
      LINES[PLAYER.line].Persons[0].X = PERSON_FRONT_OF_LINE;
      for (j=1;j<LINES[PLAYER.line].Persons.length;j++){
//	       LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].getNextXPos();
      LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j-1].X+PERSON_X_SPACING;
      }
    }

    PLAYER.line -= 1;

    PLAYER.position = LINES[PLAYER.line].Persons.length;
    PLAYER.X = LINES[PLAYER.line].getNextXPos();
    PLAYER.Y = LINES[PLAYER.line].Y;
    LINES[PLAYER.line].addPerson(PLAYER);
    recordLineData()
    PLAYER_UP = false;
  }
  //If the player can't currently change lines because the destination line is in motion
  // give some visual feedback that the button press was received
  else if (PLAYER_UP && PLAYER.line != 0 && PLAYER.line != -1 && LINES[PLAYER.line-1].isServicing && !SELECTING) {
    PLAYER.Y -= 1;
      Defect_check = true;
  }
  //If the player is in the waiting area, no need to check to see if destination line is in motion, so just go ahead and move the player
  else if (PLAYER_UP && SELECTING && PLAYER.line != 0 && PLAYER.line !=-1) {
    PLAYER.line -= 1;
    PLAYER.Y = LINES[PLAYER.line].Y;  
//      TIME_CHANGE_LINE = TIME*1000 - Math.round((new Date().getTime() - START_TIME));
//        FlagLineChange=true;
//        console.log("Ichanged at : "+TIME_CHANGE_LINE);
    PLAYER_UP = false;
  }
    //comment above when fixed initial waiting position
    else if (PLAYER_UP && SELECTING && PLAYER.line == -1) {
        getTime();
//        var difference = ((TIME_AT_REWARD) - TIME_REMAINING);
//    if (difference >1000){
    PLAYER.line += 1;
    PLAYER.Y = LINES[PLAYER.line].Y;
    TIME_AT_SELECT = TIME*1000 -(Math.round(new Date().getTime() - START_TIME));
    PLAYER_UP = false;
//    } 
  }

  //If the player has pressed the down key and is intending to change lines
  if (PLAYER_DOWN && PLAYER.line != LINES.length-1 && !LINES[PLAYER.line+1].isServicing && !SELECTING) {  // made a change here - Shruthi
    if (PLAYER.position != 0) {
      LINES[PLAYER.line].Persons.splice(PLAYER.position,1);
      for (i = PLAYER.position;i<LINES[PLAYER.line].Persons.length;i++){
	       LINES[PLAYER.line].Persons[i].X = LINES[PLAYER.line].Persons[i-1].X+ PERSON_X_SPACING;
      }
    }
    if (PLAYER.position == 0) {
      LINES[PLAYER.line].Persons.shift();
      LINES[PLAYER.line].Persons[0].X = PERSON_FRONT_OF_LINE;
      for (j=1;j<LINES[PLAYER.line].Persons.length;j++){
	       LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j-1].X + PERSON_X_SPACING;
      }
    }

    PLAYER.line += 1;

    PLAYER.position = LINES[PLAYER.line].Persons.length;
    PLAYER.X = LINES[PLAYER.line].Persons[PLAYER.position-1].X+PERSON_X_SPACING;
    PLAYER.Y = LINES[PLAYER.line].Y;
    LINES[PLAYER.line].addPerson(PLAYER);
    recordLineData()
    PLAYER_DOWN = false;
  }
  //If the player can't currently change lines because the destination line is in motion give some visual feedback that the button press was received
  else if (PLAYER_DOWN && PLAYER.line != LINES.length-1 && LINES[PLAYER.line+1].isServicing && !SELECTING) {         // more changes made - Shruthi
    PLAYER.Y += 1;
  }
  //If the player is in the waiting area, no need to check to see if destination line is in motion, so just go ahead and move the player
  else if (PLAYER_DOWN && SELECTING && PLAYER.line != LINES.length-1 && PLAYER.line != -1) {
    PLAYER.line += 1;
    PLAYER.Y = LINES[PLAYER.line].Y;
    
    PLAYER_DOWN = false;
  }
        //comment above when fixed initial waiting position

    else if (PLAYER_DOWN && SELECTING && PLAYER.line == -1) {
        getTime();
        var difference = ((TIME_AT_REWARD) - TIME_REMAINING);
//     if (difference >1000){
    PLAYER.line += 2;
    PLAYER.Y = LINES[PLAYER.line].Y;
        TIME_AT_SELECT = TIME*1000 -(Math.round(new Date().getTime() - START_TIME));
        console.log("TIme at select : " +TIME_AT_SELECT);
    PLAYER_DOWN = false;
//     }
  }



  // Check to see if the game is over
  if (TIME_REMAINING <= 0.0 && SENT == 0) {
    //End game and upload results!
    clearTimeout(AnimateHandle) //stop animation
    end_game()
  }
}

//Moves the player up in the line if possible
// This needs to be a seperate function so that a micro-delay
// can be built-in to it's execution to stop the 'move a few pixels'
// bug that occurs when trying to move while the line is in motion
function playerMoveLeft() {
  if (!LINES[PLAYER.line].isServicing) {
    for (j=PLAYER.position;j<LINES[PLAYER.line].Persons.length;j++) {
      LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j-1].X + PERSON_X_SPACING;
    }
    if (INTER_REWARDS) {
      INTER_REWARD_TIC = 1;
      INTER_REWARD = Math.round(LINE_REWARDS[PLAYER.line]/LINE_LENGTHS[PLAYER.line]);
    }
    console.log('inter rwd ' + INTER_REWARD)
    PLAYER_LEFT = false;
  }
}

function endInstructions(){
    if (GAME_STARTED == 0){
    //Close out the pisturk instructions
    psiTurk.finishInstructions();
    // Load the stage.html snippet into the body of the page, the stage.html has "myCanvas"
    psiTurk.showPage('stage.html');

    var c = document.getElementById("myCanvas");
    var ctx = c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height); //Wipe the screen
    GAME_STARTED = 1;
    init();
    doKeyDown(true);
  }
}

//Detects button presses and reacts accordingly
function doKeyDown(evt) {
  console.log("Hey from key detect!");
  Slacking_check = false;
  //Record key stroke
  recordKeyData(evt.keyCode);
  if(evt.keyCode == 37) {
    //LEFT
    if (!SELECTING) {
      PLAYER_LEFT = true;
    }
  }
  if(evt.keyCode == 38) {
    console.log("hey from up!");
    PLAYER_UP = true;
    TIME_CHANGE_LINE = TIME*1000 - Math.round((new Date().getTime() - START_TIME));
    FlagLineChange=true;
    }
    //UP!

  if(evt.keyCode == 40) {
    //DOWN!
    console.log("hey from down!");
//      PLAYER_DOWN = true;

//      console.log("Time at reward" + TIME_AT_REWARD);
//      console.log("Time remaining" + TIME_REMAINING);
//      console.log("Difference "+ ((TIME_AT_REWARD) - TIME_REMAINING));
//      var difference = ((TIME_AT_REWARD) - TIME_REMAINING);
//    if (Player.line == -1 && difference > 500){
//    PLAYER_DOWN = true;
//        TIME_AT_REWARD =0;
//    }
//      else if(PLAYER.line != -1){
          PLAYER_DOWN = true;
//      }
  }

  if(evt.keyCode == 37 && SELECTING && PLAYER.line != -1) {
    // move from selection area
    PLAYER.position = LINES[PLAYER.line].Persons.length;
    PLAYER.X = LINES[PLAYER.line].getNextXPos();
    LINES[PLAYER.line].addPerson(PLAYER);
    recordLineData()
    SELECTING = false;
    
  }

}
function end_game(){
  line_record = JSON.stringify(LINE_RECORD);
  pos_record = JSON.stringify(POS_RECORD);
  time_record = JSON.stringify(TIME_RECORD);
  reward_record = JSON.stringify(REWARD_RECORD);
  key_record = JSON.stringify(KEY_RECORD);
  key_time_record = JSON.stringify(KEY_TIME_RECORD);
  player_score = PLAYER_SCORE;
  episode_record = JSON.stringify(EpisodeRecord);

  //Display "saving" on the board
  var c = document.getElementById("myCanvas");
  var ctx = c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height); //Wipe the screen

  ctx.font="40px Georgia";
  ctx.fillStyle = "#008000";
  ctx.fillText("Saving Data...",230,125);

  ctx.stroke();
  // write data
  psiTurk.recordTrialData({'phase':"GAME",
				    'lines':line_record,
		    'positions':pos_record,
				    'linetimes':time_record,
				    'keys':key_record,
				    'keytimes':key_time_record,
				    'rewards':reward_record,
				    'Score':player_score,
                    'Episode Data':episode_record}
				  );
  // save data to server, compute bonus

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
				  psiTurk.completeHIT();});
    }
  }
);

    //done for git commit
  //in case of failure call back
  setTimeout(save2Server,3000);
};
//Add a key detector to allow for interaction
window.addEventListener('keydown',doKeyDown,true);

// Task object to keep track of the current phase
var currentview;

/*******************
* Run Task
******************/
$(window).load( function(){
  psiTurk.doInstructions(
    instructionPages, // a list of pages you want to display in sequence
    function() { endInstructions() } // what you want to do when you are done with instructions
  );
});
