/*
* Requires:
*     psiturk.js
*     utils.js
*/

// Initalize psiturk object
var psiTurk = PsiTurk(uniqueId, adServerLoc);

////
//// GAME GLOBAL VARS
////
var PLAYER_SCORE = 0;	//Keeps track of the players score
var NUM_LINES = 3;	//Change to add more lines to the program 3 works well, I think
var LINES = [];		//This is an array that will be used to keep track of all the persons in each line
var LINE_REWARDS = [9, 24, 60];	//This sets the reward for each line. If you increase the NUM_LINES, add additional entries here
var LINE_LENGTHS = [3, 6, 12];	//This sets the length of each line. If you increase the NUM_LINES, add additional entries here
///These control the intermediate reward function
var INTER_REWARDS = false;	//Set this to true if you want the estimate intermediate reward to display, false if you don't
var INTER_REWARD = 0;
var INTER_REWARD_TIC = 0;
var TIC = 0;
var REWARD_TIC = 0;
var REWARD = 0;
var PLAYER;
var SELECTING = true;
var PLAYER_LEFT = false;
var CHA_CHING = new Audio('../static/media/Cha-Ching.mp3');
var IMG_PERSON = new Image();
var IMG_PLAYER = new Image();
var ARRIVE = [];
var SERVICE = [];
var ANIMATE_INTERVAL = 20; //rate at which the animate function is called in ms
var INTERVAL = 100;// INTERVAL * ANIMATE_INTERVAL is the rate at which lines advance
var INTERVAL_SFT = 25;//shift to the INTERVAL for random assignment of line advancement
var PLAYER_UP = false;
var PLAYER_DOWN = false;
var START_TIME = 0;
var TIME_REMAINING = 100.000;//un-rounded time remaining (milliseconds)
var TIME_REMAINING_RND = 100;//integer time remaining for display
var TIME = 20; // experiment duration
var LINE_RECORD = [];
var TIME_RECORD = [];
var REWARD_RECORD = [];
var KEY_RECORD = [];//record for all game move key strokes
var KEY_TIME_RECORD = [];//associated time for all key strokes
var SENT = 0;
var GAME_STARTED = 0;

//Randomly decide between having intermediate rewards on or off
if (Math.round(Math.random()) == 0){
  INTER_REWARDS = false;
  //console.log("condition is " + INTER_REWARDS);
}
else{
  INTER_REWARDS = true;
  //console.log("condittion is " + INTER_REWARDS);
}

// set condition in database
psiTurk.taskdata.set('cond',INTER_REWARDS)

var mycounterbalance = counterbalance;  // they tell you which condition you have been assigned to
// they are not used in the stroop code but may be useful to you

//List of all pages that need to be loaded
var pages = [
"instructions/instruct-1.html",
"instructions/instruct-2.html",
"instructions/instruct-ready_c1.html",
"instructions/instruct-ready_c2.html",
"stage.html"
];

psiTurk.preloadPages(pages);

//change last page based on the experimental condition
if (INTER_REWARDS) {
  var instructionPages = [ // add as a list as many pages as you like
  "instructions/instruct-1.html",
  "instructions/instruct-2.html",
  "instructions/instruct-ready_c2.html"
  ];
} else {
  var instructionPages = [ // add as a list as many pages as you like
  "instructions/instruct-1.html",
  "instructions/instruct-2.html",
  "instructions/instruct-ready_c1.html"
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


/////
///// FUNCTIONS
/////

//The init function to set everything up before the game gets started
function init() {
  START_TIME = Math.round(new Date().getTime());
  console.log("Hi from init!");
  console.log("condition is " + INTER_REWARDS);
  var c = document.getElementById("myCanvas");
  for (i=0;i<NUM_LINES;i++) {
    LINES.push(new Line(c.height/NUM_LINES/2*(i+1)));
    ARRIVE.push(Math.round(Math.random()*INTERVAL-INTERVAL_SFT));
    SERVICE.push(Math.round(Math.random()*INTERVAL-INTERVAL_SFT));
    for (j=0;j<LINE_LENGTHS[i];j++) {
      LINES[i].addPerson(new Person(30*(j+1)+30,LINES[i].Y));
      console.log(LINES[i].Persons[j].X);
    }
  }
  IMG_PERSON.src = "../static/images/stick_figure.jpg";
  IMG_PLAYER.src = "../static/images/stick_figure_red.jpg";
  L = Math.ceil(Math.random() * 3) - 1;
  PLAYER = new Player(535,LINES[L].Y,L,-1);
  //LINES[0].Persons[LINES[0].Persons.length-1].PC = true;
  //draw();
  setInterval(animate,ANIMATE_INTERVAL);
  console.log("Bye from init!");
}

//Draws the current state of the game to the screen
function draw(){
  //console.log("Hi from draw!");
  var c = document.getElementById("myCanvas");
  var ctx = c.getContext("2d");
  ctx.beginPath();
  ctx.clearRect(0,0,c.width,c.height); //Wipe the screen
  ctx.fillStyle="#000000";
  for (i=0;i<NUM_LINES;i++){
    ctx.font="20px Georgia";
    ctx.fillText(LINE_REWARDS[i].toString(),5,LINES[i].Y+10);
    for (j=0;j<LINES[i].Persons.length;j++){
      if (LINES[i].Persons[j].PC){
	ctx.drawImage(IMG_PLAYER,LINES[i].Persons[j].X,LINES[i].Persons[j].Y - 10,25,25);
	///This is legacy code that draws a colored square instead of the little figure
	/*ctx.fillStyle="#FF0000";
	*				    ctx.fillRect(LINES[i].Persons[j].X,LINES[i].Persons[j].Y,10,10);
	*				    ctx.fillStyle="#000000";*/
      } else {
	ctx.drawImage(IMG_PERSON,LINES[i].Persons[j].X,LINES[i].Persons[j].Y - 10,25,25);
	///This is legacy code that draws a colored square instead of the little figure
	//ctx.fillRect(LINES[i].Persons[j].X,LINES[i].Persons[j].Y,10,10);
      }
    }
  }
  if (SELECTING) {
    ctx.drawImage(IMG_PLAYER,PLAYER.X,PLAYER.Y - 10,25,25);
    ///This is legacy code that draws a colored square instead of the little figure
    /*ctx.fillStyle="#FF0000";
    *		    ctx.fillRect(PLAYER.X,PLAYER.Y,10,10);
    *		    ctx.fillStyle="#000000";*/
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.font="40px Georgia";
  ctx.fillStyle ="#000000";
  ctx.fillText("Score:",5,40);
  ctx.fillText(PLAYER_SCORE.toString(),140,41);
  getTime();
  TIME_REMAINING_RND = Math.round(TIME_REMAINING/1000)
  ctx.fillText("Time:",370,41);
  ctx.fillText(TIME_REMAINING_RND.toString(),490,41);
  ctx.font="20px Georgia";
  ctx.fillText("Controls:",5,300);
  ctx.fillText("Press the left arrow to move ahead in line when a spot is available",5,320);
  ctx.fillText("Press the up/down arrows to switch lines at any time",5,340);
  ctx.fillText("Remember, if you wait too long to move up someone will take your spot!",5,360);
  if (REWARD_TIC > 0){
    ctx.font="30px Georgia";
    ctx.fillStyle = "#008000";
    ctx.fillText("+",190,39);
    ctx.fillText(REWARD.toString(),210,39);
    ctx.fillStyle ="#000000";
  }
  //console.log("tic " + INTER_REWARD_TIC)
  //console.log("Reward " + INTER_REWARD)
  if (INTER_REWARD_TIC > 0) {
    ctx.font="20px Georgia";
    ctx.fillStyle = "#008000";
    ctx.fillText("+",230,35);
    ctx.fillText(INTER_REWARD.toString(),250,36);
    ctx.fillStyle ="#000000";
  }
  ctx.strokeStyle="#000000";
  ctx.strokeRect(530,50,30,200);
  ctx.strokeStyle="#008080";
  ctx.strokeRect(54,50,30,200);
  ctx.stroke();
  ctx.beginPath();
  for (i=0;i<NUM_LINES;i++){
    ctx.clearRect(525,LINES[i].Y-10,10,30);
    //ctx.clearRect(49,LINES[i].Y+10,10,30);
    //ctx.clearRect(75,LINES[i].Y-10,10,30);
  }
  ctx.stroke();
  
  //console.log("Bye from draw!");
}
function getTime(){
  //Update the time calculation
  TIME_REMAINING = TIME*1000 - (new Date().getTime()- START_TIME);
}
function recordRewardData(){
  //For recording line history data
  REWARD_RECORD.push(REWARD);
  getTime();
  REWARD_RECORD.push(TIME_REMAINING);
  console.log(REWARD_RECORD);
};
function recordLineData(){
  //For recording line history data
  LINE_RECORD.push(PLAYER.line);
  getTime();
  TIME_RECORD.push(TIME_REMAINING);
  console.log(LINE_RECORD);
};
function recordKeyData(stroke){
  //For recording key stroke history
  KEY_RECORD.push(stroke);
  getTime();
  KEY_TIME_RECORD.push(TIME_REMAINING);
  console.log(LINE_RECORD);
};
//This is called repeatedly to update the state of the game and
// animate the lines
function animate(){
  if (TIME_REMAINING_RND == 0 && SENT == 0) {
    //End game and upload results!
    end_game()
  }
  TIC = TIC + 1;			//Update the TIC global var to keep time
  //Reset count when the interval (set in global vars) has passed
  if (TIC > INTERVAL) {
    TIC = 0;
    for (i=0;i<NUM_LINES;i++){
      if (LINES[i].Persons.length < LINE_LENGTHS[i] && PLAYER.line != i) {
	LINES[i].addPerson(new Person(LINES[i].Persons[LINES[i].Persons.length-1].X+30,LINES[i].Y));
      }
      /*if (LINES[i].Persons.length < (LINE_LENGTHS[i] + 1) && PLAYER.line == i) {
      *				    LINES[i].addPerson(new Person(LINES[i].Persons[LINES[i].Persons.length-1].X+30,LINES[i].Y));
    }*/
      if (LINES[i].Persons.length > LINE_LENGTHS[i] && PLAYER.line != i) {
	LINES[i].Persons.pop();
      }
      /*if (LINES[i].Persons.length > (LINE_LENGTHS[i] + 1) && PLAYER.line == i) {
      *				    if (PLAYER.position != (LINES[PLAYER.line].Persons.length-1)){
      *						    LINES[i].Persons.pop();
    }
    }*/
      ARRIVE[i] = (Math.round(Math.random()*(INTERVAL-50)));
      SERVICE[i] = (Math.round(Math.random()*(INTERVAL-50)));
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
    if (INTER_REWARD_TIC > 50){
      INTER_REWARD_TIC = 0;
      INTER_REWARD = 0;
    }
  }
  //Walk through the lines and check if any of them is scheduled
  // for a service event or an arrival
  for (i=0;i<NUM_LINES;i++){
    if (ARRIVE[i] == TIC){
      LINES[i].addPerson(new Person(LINES[i].Persons[LINES[i].Persons.length-1].X+30,LINES[i].Y));
      //LINES[i].isArriving = false;
    }
    if (SERVICE[i] == TIC){
      LINES[i].isServicing = true;
    }
    /*if(LINES[i].isArriving){
    *			    if (LINES[i].Persons.length < LINE_LENGTHS[i] + 1) { 
    *				    LINES[i].addPerson(new Person(LINES[i].Persons[LINES[i].Persons.length-1].X+30,LINES[i].Y));
    *				    LINES[i].isArriving = false;
  }
  }*/
    //If a line needs to move up and the player is not in it
    // simply move up the entire line
    if(LINES[i].isServicing && !SELECTING && PLAYER.line != i ){
      for(j=0;j<LINES[i].Persons.length;j++) {
	LINES[i].Persons[j].X -= 1;
      }
      if (LINES[i].Persons[0].Y == LINES[i].Y + 20) {
	LINES[i].Persons[0].X -= 1;
      } else {
	LINES[i].Persons[0].Y += 1;
      }
      //console.log(LINES[i].Persons[0].X);
      if(LINES[i].Persons[1].X == 60) {
	LINES[i].Persons.shift();
	LINES[i].isServicing = false;
      }
    } else if (LINES[i].isServicing && SELECTING) {
      for(j=0;j<LINES[i].Persons.length;j++) {
	LINES[i].Persons[j].X -= 1;
      }
      if (LINES[i].Persons[0].Y == LINES[i].Y + 20) {
	LINES[i].Persons[0].X -= 1;
      } else {
	LINES[i].Persons[0].Y += 1;
      }
      //console.log(LINES[i].Persons[0].X);
      if(LINES[i].Persons[1].X == 60) {
	LINES[i].Persons.shift();
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
	if (LINES[i].Persons[0].Y == LINES[i].Y + 20) {
	  LINES[i].Persons[0].X -= 1;
	} else {
	  LINES[i].Persons[0].Y += 1;
	}
	//console.log(LINES[i].Persons[0].X);
	if(LINES[i].Persons[0].X < 22) {
	  LINES[i].Persons.shift();
	  PLAYER.position -= 1;
	  LINES[i].isServicing = false;
	  recordLineData();
	  console.log("Player pos");
	  console.log(PLAYER.position);
	}
      } else if (PLAYER.position == 0 && PLAYER.X < 61) {
	console.log("Reward!");
	LINES[i].isServicing = false;
	LINES[i].Persons.shift();
	LINES[i].Persons.pop();
	LINES[i].Persons[0].X = 60;
	for (j=1;j<LINES[i].Persons.length;j++){
	  LINES[i].Persons[j].X = LINES[i].Persons[j-1].X + 30;
	}
	REWARD = LINE_REWARDS[PLAYER.line];
	REWARD_TIC = 1;
	CHA_CHING.play();
	PLAYER.line = Math.ceil(Math.random() * 3) - 1;
	PLAYER.position = -1;
	SELECTING = true;
	PLAYER_LEFT = false;
	PLAYER.X = 535;
	PLAYER.Y = LINES[PLAYER.line].Y;
	//draw();
      }
    }
    //If player has pressed the left arrow and needs to be moved up
    if(PLAYER_LEFT && PLAYER.position != 0 && (LINES[PLAYER.line].Persons[PLAYER.position].X - LINES[PLAYER.line].Persons[PLAYER.position-1].X) > 30 && !LINES[i].isServicing) {
      setTimeout(playerMoveLeft(),2);
    } else if(PLAYER_LEFT && PLAYER.position == 0 && PLAYER.X > 60 && !LINES[i].isServicing) {
      console.log("Last step!");
      PLAYER.X = 60;
      for(j=1;j<LINES[PLAYER.line].Persons.length;j++) {
	LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j-1].X + 30;
      }
    }
    //If the player slacks off and doesn't move up
    //if((PLAYER.position > 1) && ((LINES[PLAYER.line].Persons[PLAYER.position].X - LINES[PLAYER.line].Persons[PLAYER.position-1].X) > 60) && (PLAYER.position < LINES[PLAYER.line].Persons.length-1)) {
    if((PLAYER.position > 0) && TIC > (INTERVAL - 5) && PLAYER.position < (LINES[PLAYER.line].Persons.length-1) && !PLAYER_LEFT && ((LINES[PLAYER.line].Persons[PLAYER.position].X - LINES[PLAYER.line].Persons[PLAYER.position-1].X) > 35)) {
      console.log("Slacking!");
      LINES[PLAYER.line].Persons[PLAYER.position + 1].X = LINES[PLAYER.line].Persons[PLAYER.position - 1].X + 30;
      LINES[PLAYER.line].Persons[PLAYER.position] = LINES[PLAYER.line].Persons[PLAYER.position + 1];
      LINES[PLAYER.line].Persons[PLAYER.position + 1] = PLAYER;
      PLAYER.position += 1;
      for(j=PLAYER.position+1;j<LINES[PLAYER.line].Persons.length;j++) {
	LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j-1].X + 30;
      }
    } else if (PLAYER.position == 0 && PLAYER.X > 60 && TIC > (INTERVAL - 5) && !PLAYER_LEFT) {
      console.log("Slacking at the front!");
      LINES[PLAYER.line].Persons[PLAYER.position + 1].X = 60;
      LINES[PLAYER.line].Persons[0] = LINES[PLAYER.line].Persons[1];
      LINES[PLAYER.line].Persons[1] = PLAYER;
      PLAYER.position = 1;
      for(j=2;j<LINES[PLAYER.line].Persons.length;j++) {
	LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j-1].X + 30;
      }
    }
  }
  //If the player has pressed the UP key and is intending to change lines
  if (PLAYER_UP && PLAYER.line != 0 && !LINES[PLAYER.line-1].isServicing && !SELECTING) {
    if (PLAYER.position != 0) {
      LINES[PLAYER.line].Persons.splice(PLAYER.position,1);
      for (i = PLAYER.position;i<LINES[PLAYER.line].Persons.length;i++){
	LINES[PLAYER.line].Persons[i].X = LINES[PLAYER.line].Persons[i-1].X+30;
      }
    }
    if (PLAYER.position == 0) {
      LINES[PLAYER.line].Persons.shift();
      LINES[PLAYER.line].Persons[0].X = 60;
      for (j=1;j<LINES[PLAYER.line].Persons.length;j++){
	LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j-1].X + 30;
      }
    }
    
    PLAYER.line -= 1;
    
    PLAYER.position = LINES[PLAYER.line].Persons.length;
    PLAYER.X = LINES[PLAYER.line].Persons[PLAYER.position-1].X+30;
    PLAYER.Y = LINES[PLAYER.line].Y;
    LINES[PLAYER.line].addPerson(PLAYER);
    recordLineData()
    PLAYER_UP = false;
  }
  //If the player can't currently change lines because the destination line is in motion
  // give some visual feedback that the button press was received 
  else if (PLAYER_UP && PLAYER.line != 0 && LINES[PLAYER.line-1].isServicing && !SELECTING) {
    PLAYER.Y -= 1;
  }
  //If the player is in the waiting area, no need to check to see if destination line is in
  // motion, so just go ahead and move the player 
  else if (PLAYER_UP && SELECTING && PLAYER.line != 0) {
    PLAYER.line -= 1;
    PLAYER.Y = LINES[PLAYER.line].Y;
    PLAYER_UP = false;
  }
  //If the player has pressed the down key and is intending to change lines
  if (PLAYER_DOWN && PLAYER.line != 2 && !LINES[PLAYER.line+1].isServicing && !SELECTING) {
    if (PLAYER.position != 0) {
      LINES[PLAYER.line].Persons.splice(PLAYER.position,1);
      for (i = PLAYER.position;i<LINES[PLAYER.line].Persons.length;i++){
	LINES[PLAYER.line].Persons[i].X = LINES[PLAYER.line].Persons[i-1].X+30;
      }
    }
    if (PLAYER.position == 0) {
      LINES[PLAYER.line].Persons.shift();
      LINES[PLAYER.line].Persons[0].X = 60;
      for (j=1;j<LINES[PLAYER.line].Persons.length;j++){
	LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j-1].X + 30;
      }
    }
    
    PLAYER.line += 1;
    
    PLAYER.position = LINES[PLAYER.line].Persons.length;
    PLAYER.X = LINES[PLAYER.line].Persons[PLAYER.position-1].X+30;
    PLAYER.Y = LINES[PLAYER.line].Y;
    LINES[PLAYER.line].addPerson(PLAYER);
    recordLineData()
    PLAYER_DOWN = false;
  } 
  //If the player can't currently change lines because the destination line is in motion
  // give some visual feedback that the button press was received 
  else if (PLAYER_DOWN && PLAYER.line != 2 && LINES[PLAYER.line+1].isServicing && !SELECTING) {
    PLAYER.Y += 1;
  } 
  //If the player is in the waiting area, no need to check to see if destination line is in
  // motion, so just go ahead and move the player 
  else if (PLAYER_DOWN && SELECTING && PLAYER.line != 2) {
    PLAYER.line += 1;
    PLAYER.Y = LINES[PLAYER.line].Y;
    PLAYER_DOWN = false;
  }
  //setTimeout(draw(),10);
  draw();
}

//Moves the player up in the line if possible
// This needs to be a seperate function so that a micro-delay
// can be built-in to it's execution to stop the 'move a few pixels'
// bug that occurs when trying to move while the line is in motion
function playerMoveLeft() {
  if (!LINES[PLAYER.line].isServicing) {
    for (j=PLAYER.position;j<LINES[PLAYER.line].Persons.length;j++) {
      LINES[PLAYER.line].Persons[j].X = LINES[PLAYER.line].Persons[j-1].X + 30;
    }
    if (INTER_REWARDS) {
      INTER_REWARD_TIC = 1;
      INTER_REWARD = Math.round(LINE_REWARDS[PLAYER.line]/LINE_LENGTHS[PLAYER.line]);
    }
    console.log('inter rwd ' + INTER_REWARD)
    PLAYER_LEFT = false;
  }
}

//Detects button presses and reacts accordingly
function doKeyDown(evt) {
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
  }
  console.log("Hey from key detect!");
  //Record key stroke
  recordKeyData(evt.keyCode);
  if(evt.keyCode == 37) {
    //LEFT!
    if (!LINES[PLAYER.line].isServicing && !SELECTING) {
      PLAYER_LEFT = true;
    }
  }
  if(evt.keyCode == 38) {
    console.log("hey from up!");
    PLAYER_UP = true;
    //UP!
  }
  if(evt.keyCode == 40) {
    //DOWN!
    PLAYER_DOWN = true;
  }
  if(evt.keyCode == 37 && SELECTING && !LINES[PLAYER.line].isServicing) {
    PLAYER.position = LINES[PLAYER.line].Persons.length;
    PLAYER.X = LINES[PLAYER.line].Persons[PLAYER.position-1].X+30;
    LINES[PLAYER.line].addPerson(PLAYER);
    recordLineData()
    SELECTING = false;
  }
  
}
function end_game(){
  //LINE_RECORD
  //REWARD_RECORD
  //PLAYER_SCORE
  line_record = JSON.stringify(LINE_RECORD);
  time_record = JSON.stringify(TIME_RECORD);
  reward_record = JSON.stringify(REWARD_RECORD);
  key_record = JSON.stringify(KEY_RECORD);
  key_time_record = JSON.stringify(KEY_TIME_RECORD);
  player_score = PLAYER_SCORE;

  if (SENT == 0){
    psiTurk.recordTrialData({'phase':"GAME",
                                     'lines':line_record,
				     'linetimes':time_record,
				     'keys':key_record,
				     'keytimes':key_time_record,
                                     'rewards':reward_record,
                                     'Score':player_score}
                                   );
    console.log('quitting')
    //psiTurk.completeHIT();
	  //record_responses();
	  psiTurk.saveData({
	  success: function(){
	      psiTurk.computeBonus('compute_bonus', function() { 
		  psiTurk.completeHIT(); // when finished saving compute bonus, the quit
	      }); 
	  }});
    SENT = 1;
  };
  

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
    function() { doKeyDown(true) } // what you want to do when you are done with instructions
  );
});
