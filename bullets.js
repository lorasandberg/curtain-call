//javascirpt

//The canvas object in the website where the game is drawn.
var Canvas;

//The context object of the canvas which is used when drawing objects to the canvas.
var Context;

//?
var Position;

//An array containing all the alive bullets. Used when updating, drawing, checking collisions of or removing bullets.
var Particles = new Array();

//An array containing all the bullet patterns. Initialized in the stage script.
var Waves = new Array();

//Index showing which wave is currently being updated.
var currentWave = 0;

//Bounds of the canvas.
var Bounds;

//?
var alpha = 0;

//?
var I = 0;

//Number of waves the player has cleared in one game.
var WavesCleared = 0;

//The player's highscore's ID in the database. Used when indicating which of the highscores is the player's own.
var playerID;

//?
var IsRunning = true;

//Stage object. Imported from the stage script.
var Stage;

//The possible states of the game.
this.GameState = {
	START : 0,
	RUN : 1,
	GAME_OVER : 2,
	FINISH : 3,
	PAUSE : 4
}

//The current state of the game.
var State;
//Developer
var playerInvincibility;
//Framerate
var FPS = 0;
//An average framerate
var averageFPS = 0;
//?
var frames = 0;
//Time used to loop one frame in seconds.
var deltaTime = 0;
//Normal framerate.
var desiredFPS = 60;
//Used?
var deltaSeconds = 0;
//Used?
var elapsedTime = 0;
//The game loop. The variable is used mainly when resetting the loop.
var loop;
//The player object.
var Player;
//An array of bullet sprites. Initialized in the stage script.
var BulletSprites = new Array();
//The player position in the beginning of the game and at respawn.
var playerInitialPosition;
//An array of user inputs. Contains boolean value if the button of the index is being pressed.
var Input;
//The input keys used in the games. The array is used to prevent default actions of the keys, e.g. scrolling with arrow keys.
//32 = Shift
//16 = Space
//37-40 = Arrow keys
var UsedInputKeys = new Array(32, 16, 37, 38, 39, 40);

var STORAGE_ID = 'curtaincall-highscore';

//Functions for detecting user inputs. In addition to setting values of the Input array it prevents default actions of the buttons used in the game.
document.onkeydown = function(e)
{ Input[e.keyCode] = true; if(jQuery.inArray(e.keyCode, UsedInputKeys) >= 0) { e.preventDefault(); } }
document.onkeyup = function(e)
{ Input[e.keyCode] = false; }

//Reset the game.
function Reset()
{
	currentWave = 0;
	deaths = 0;
	WavesCleared = 0;
	clearInterval(loop);
	Input = new Array();
	Waves = new Array();
	BulletSprites = new Array();
	Particles = new Array();
}

//Initialize the game.
function Initialize()
{
	Reset();
	playerInvincibility = false;
	//Get the canvas element.
	Canvas = document.getElementById("canvas");

	//Get the context element of the canvas.
	Context = Canvas.getContext('2d');

	//Get bounds of the canvas.
	Bounds = new Vector2(Canvas.width, Canvas.height);

	//Used?
	Position = new Vector2(Bounds.X - 10, 10);

	//Set player initial position.
	playerInitialPosition = new Vector2(Bounds.X/2, Bounds.Y * 0.8);

	//Create the player object.
	player = new Player(new Vector2(playerInitialPosition.X, playerInitialPosition.Y));

	//Set the game state.
	State = GameState.START;

	//Initialize the stage object from the stage script.
	Stage = new StageScript();

	//Initialize wave and bullet sprite arrays.
	Waves = Stage.InitWaves();
	BulletSprites = Stage.InitSprites();

	//Get local highscore
	getLocalStorageHighscore();

	//Set the game loop.
	loop = setInterval(function(){ Main(); }, 1000/desiredFPS);
}

//Timestamp of the end of the last loop.
var lastLoop = new Date;

//Used?
var thisLoop = new Date;
var drawLoop = new Date;
var temp = "";
var drawTime = 0;
var updateTime = 0;
var fullTime = 0;
var switchTime = 0;

var drawFPS = "00.0";
var drawFPStotal = 0;
var drawFPScounter = 0;
var drawFPScount = 0;

//A boolean value used to detect if space is pressed instead of kept pressed down.
var pauseReleased = true;

//The main loop function of the game.
function Main()
{
	elapsedTime = (new Date) - thisLoop;
	//Set timestamp for FPS calculating
	thisLoop = new Date;

	//Clear the canvas.
	Context.clearRect(0, 0, Bounds.X, Bounds.Y);

	//If the game state is START, check if the player presses space to start the game.
	if(Input[32] && State == GameState.START && pauseReleased)
	{ State = GameState.RUN; pauseReleased = false; }

	//Set game to pause and return by space when running.
	if(Input[32] && State == GameState.RUN && pauseReleased)
	{ State = GameState.PAUSE; pauseReleased = false; }
	if(Input[32] && State == GameState.PAUSE && pauseReleased)
	{ State = GameState.RUN; pauseReleased = false; }

	//Space is released after pressed down.
	if(!Input[32])
	{ pauseReleased = true; }

	//Deciding what actions the main loop should do in the current state of the game.
	switch(State)
	{
		case GameState.RUN:
		//The main update loop.
		Update();

		//Used to calculate drawing time.
		drawLoop = new Date;
		//If the game is still running (is not ended in the update loop), doing the draw loop.
		if(IsRunning)
		{ Draw(Context); }
		break;

		case GameState.GAME_OVER:
			drawLoop = new Date;
		//Show the player that the game has ended.
		DrawCenter(Context, "Game Over");
		break;

		case GameState.FINISH:
			drawLoop = new Date;
		//Show the player that the game has been cleared.
		DrawCenter(Context, "Game Cleared ^-^");
		break;

		case GameState.START:
			drawLoop = new Date;
			//Show the player that they can start the game by pressing space.
			DrawCenter(Context, "Start game by pressing space");
		break;

		case GameState.PAUSE:
			//Is game is paused, the draw loop is still looped, but the update loop is not.
			drawLoop = new Date;
			if(IsRunning)
			{ Draw(Context); }
			//Show the player that the game is paused.
			DrawCenter(Context, "Pause");
		break;
	}

	//If the game has ended, allow user to restart it by pressing space.
	if(State == GameState.GAME_OVER || State == GameState.FINISH)
	{
		Context.textAlign = "center";
		Context.fillText("Press space", Bounds.X/2, Bounds.Y/2 + 40);
		if(Input[32] && pauseReleased)
		{ Initialize(); pauseReleased = false; }
	}

	//Calculate framerate
	FPS = Math.round(1000/(thisLoop - lastLoop));

	//Calculate time used in the current frame.
	deltaTime = elapsedTime/(1000/desiredFPS);

	//Used ?
	deltaSeconds = (thisLoop - lastLoop)/1000;

	//Used ?
	//temp = thisLoop - lastLoop;

	//Count frames and "total framerate" of 50 milliseconds for calculating the average framerate within this interval.
	drawFPScount++;
	drawFPStotal += FPS;
	if(drawFPScounter > 50)
	{
		//Change the FPS value which is shown to the user in only every 50 milliseconds.
		//Count average of framerates withing this 50 milliseconds.
		drawFPS = drawFPStotal / drawFPScount;

		//Round the framerate value to one decimal place value
		drawFPS = Math.round(drawFPS * 10) / 10;

		//Reset 50 milliseconds counters.
		drawFPScount = 0;
		drawFPScounter = 0;
		drawFPStotal = 0;
	}
	else
		drawFPScounter += deltaTime;

	//Change some values of the performance to the developer every 0.5 seconds.
	if(switchTime > 400)
	{
		switchTime = 0;
		updateTime = drawLoop - thisLoop;
		drawTime = new Date - drawLoop;
		fullTime = new Date - thisLoop;
	}
	else
		switchTime += elapsedTime;

	//Set lastloop's value for calculating deltaTime of the next frame.
	lastLoop = thisLoop;

	//Increase framecount
	frames++;

	//Count average framerate.
	averageFPS = ((averageFPS * (frames - 1)) + FPS) / frames;


}

//Used ?
var counter = 0;

//The Main Update Loop
//Player update
//Bullet update
//Wave update
//Collision check
function Update()
{
	//Update player
	player.Update(Bounds, Input);

	//Update current wave
	Waves[currentWave].Update();

	//Check if the current wave has ended
	if(!Waves[currentWave].Alive)
	{
		//Increase the number of cleared waves.
		WavesCleared++;

		//Also remove bullets on the screen.
		Particles.splice(0, Particles.length);

		//If there are still waves left, continue the game and set the next wave to the current.
		//If not, end the game.
		if(currentWave + 1 < Waves.length)
		{ currentWave++;  }
		else
		{
			State = GameState.FINISH;
			GameOver();
		}
	}

	//Go through all the bullets
	for (var i = 0; i < Particles.length; i++)
	{
		//Check if the bullet is alive.
		//If it is, update it
		//If it's not, delete it
		if(Particles[i].Alive)
		{
			//Update the bullet
			Particles[i].Update(Bounds);

			//Check collision with player
			if(Particles[i].Safety == "danger" && Particles[i].Behavior.Collision(player.Position) && !playerInvincibility)
			{
				//If the bullet collides, remove all bullets
				Particles.splice(0, Particles.length);
				//and increase player's death count
				player.Deaths++;
				//and move player to the initial position
				player.Position = new Vector2(playerInitialPosition.X, playerInitialPosition.Y);
				//and stop looping the bullet array.
				break;
			}
		}
		else
		{
			//Remove bullet
			Particles.splice(i, 1); i--;
		}
	}
}

//The Main draw loop
//Draws data on the screen
//Draws player
//Draws bullets
function Draw(ctx)
{

	//Draw player
	player.Draw(ctx);

	//Start going through bullet loop for drawing bullets.
	ctx.beginPath();
	for(var i = 0; i < Particles.length; i++)
	{
		//Bullets are only drawn if they're alive
		//Bullet's draw (and update) function is in the behavior object of the bullet.
		//Behavior determines how bullet functions and how it's drawn, collision checked or killed.
		if(Particles[i].Alive)
		{ Particles[i].Behavior.Draw(ctx); }
	}
	ctx.closePath();

	//Context (ctx) object is used to draw stuff on the canvas.
	ctx.beginPath

	//Draw bullet count and player death count in white 13px Tahoma font.
	ctx.fillStyle = getColor(255,255,255,1);
	ctx.font = "13px Tahoma";
	ctx.fillText("Bullets: "+Particles.length, 10, 15);
	ctx.fillText("Lives: "+ (10 - player.Deaths), 10, 30);
	//Draw the current wave's time limit in the upper-right corner of the screen.
	ctx.font = "20px Tahoma";
	ctx.textAlign = "right";
	ctx.fillText(Math.round(Waves[currentWave].timeLimit), Bounds.X - 5, 20);


	//Draw framerate and average framerate
	DrawFramerate(ctx);
	ctx.closePath();

}

//Draw stuff in the center of the screen
function DrawCenter(ctx, text)
{
	ctx.fillStyle = getColor(255,255,255,1);
	ctx.font = "30px Tahoma";
	ctx.textAlign = "center";
	ctx.fillText(text, Bounds.X/2, Bounds.Y/2);
	//Draw framerates
	DrawFramerate(ctx);
}

//Function to draw framerate on the screen.
function DrawFramerate(ctx)
{
	//Draw information about the frame rate in the lower-left corner of the screen.
	ctx.textAlign = "left";
	ctx.font = "12px Tahoma";
	var drawavgfps = ((Math.round(averageFPS * 10) / 10) + "");

	//Add ".0" if the value is whole number.
	if(drawavgfps.length == 2) { drawavgfps = drawavgfps + ".0"; }
	if((drawFPS + "").length == 2) { drawFPS = drawFPS + ".0"; }

	/*
	//Developer stuff
	ctx.fillText("FrameTime: " + elapsedTime, 10, 	Bounds.Y - 75);
	ctx.fillText("Update: " + updateTime, 10, 	Bounds.Y - 61);
	ctx.fillText("Draw: " + drawTime, 10, 		Bounds.Y - 47);
	ctx.fillText("Full: " + fullTime, 10, 		Bounds.Y - 33);

	//Framerate
	ctx.fillText("FPS:  " + drawFPS, 10, 		Bounds.Y - 19);
	ctx.fillText("AVG: " + drawavgfps, 10, 		Bounds.Y - 5);*/
}


function Player(pos)
{
	this.Position = pos;
	this.Color = getColor(255,255,255,1);
	this.Size = 7;
	this.movement = new Vector2(0,0);
	this.Deaths = 0;

	this.Update = function _update(bounds, Input)
	{
		if(Input[16])
		{ this.Speed = 1; }
		else
		{ this.Speed = 3; }

		if(Input[37])
		{ this.movement.X -= this.Speed; }
		if(Input[38])
		{ this.movement.Y -= this.Speed; }
		if(Input[39])
		{ this.movement.X += this.Speed; }
		if(Input[40])
		{ this.movement.Y += this.Speed; }


		if(this.movement.Length() > 4)
		{ this.movement.Normalize(); this.movement.X *= 4; this.movement.Y *= 4; }

		this.Position.Add(MultipleVector(this.movement, deltaTime));
		this.Position.X = Clamp(this.Position.X, 0 + this.Size, bounds.X - this.Size);
		this.Position.Y = Clamp(this.Position.Y, 0 + this.Size, bounds.Y - this.Size);
		this.movement = new Vector2(0,0);

		if(this.Deaths >= 10)
		{
			State = GameState.GAME_OVER;
			GameOver();
		}
	}

	this.Draw = function _draw(ctx)
	{
		ctx.beginPath();
		ctx.fillStyle = this.Color;
		ctx.arc(this.Position.X, this.Position.Y, this.Size, 0, Math.PI*2, true);
		ctx.fill();
		ctx.closePath();
	}
}

function GameOver()
{
	if(!Development)
	{
		localStorage.setItem(STORAGE_ID, JSON.stringify({ cleared: WavesCleared, deaths: player.Deaths }));
		getLocalStorageHighscore();
		/*
		$.post("save.php", { name: prompt("Please enter your name for highscore list.", "Random guy"), clears: WavesCleared, deaths: player.Deaths }, function (data){
			playerID = data;
			GetList();
		});*/
	}
}

function GetRecords()
{
	var records = [
		[29, 'Spike', '2012-08-20 15:22:31', 8, 6, 8],
		[30, 'Darch', '2012-04-19 20:05:41', 8, 2, 4],
		[31, 'Troikku', '2012-04-23 20:55:44', 8, 5, 5],
		[32, 'Twiliz', '2012-04-19 19:55:41', 8, 7, 2],
		[33, 'ganondwarf', '2012-04-19 19:54:21', 4, 10, 1],
		[34, 'bob saggat', '2012-04-19 19:57:18', 3, 10, 1],
		[35, 'dolan', '2012-04-19 19:59:48', 2, 10, 1],
		[36, 'kin jong ill', '2012-04-19 20:01:25', 1, 10, 1],
		[37, 'Random guy', '2012-04-19 20:09:48', 3, 10, 1],
		[38, 'Meta', '2012-04-19 20:14:18', 1, 10, 1],
		[39, 'uberthulu', '2012-04-19 22:34:31', 6, 10, 2],
		[40, 'Delicious_Aya', '2012-04-19 23:02:25', 8, 9, 1],
		[41, 'asdffjkl;aklsdj', '2012-04-20 02:07:50', 4, 10, 1],
		[42, 'Ethanaluminum', '2012-04-20 03:11:15', 3, 10, 1],
		[43, 'Yukari', '2012-04-20 03:32:00', 6, 10, 1],
		[44, 'Nobody Saw This', '2012-04-20 05:38:35', 8, 7, 1],
		[45, 'Kappamaki', '2012-04-20 07:47:03', 7, 10, 2],
		[46, 'Zergem', '2012-04-20 08:32:48', 3, 10, 1],
		[47, 'Random guy', '2012-04-20 13:45:51', 2, 10, 1],
		[48, 'Random guy', '2012-05-07 10:06:46', 2, 10, 2],
		[49, 'Random guy', '2012-04-20 17:40:52', 0, 10, 1],
		[50, 'Tonzo', '2012-04-21 14:37:16', 3, 10, 1],
		[51, 'Big G', '2012-04-25 07:17:23', 2, 10, 1],
		[52, 'Samura1man', '2012-04-25 13:16:06', 4, 10, 1],
		[53, 'bereavement', '2012-04-29 11:46:42', 4, 10, 1],
		[54, 'byrz', '2012-04-29 13:28:28', 8, 1, 6],
		[55, 'sp1nz', '2012-04-30 00:58:46', 8, 4, 3],
		[56, 'vilet', '2012-05-06 09:13:21', 1, 10, 1],
		[57, 'ivlet', '2012-05-06 09:15:09', 2, 10, 1],
		[58, 'miksu', '2012-05-07 17:00:10', 3, 10, 1],
		[59, 'Random guy', '2012-05-11 14:57:54', 2, 10, 1],
		[60, 'Random guy', '2012-06-18 10:23:08', 2, 10, 1],
		[61, 'Climbkid Rinale', '2012-07-01 23:35:05', 8, 8, 5],
		[62, 'Random guy', '2012-07-05 22:18:28', 3, 10, 1],
		[63, 'Random guy', '2012-07-14 22:49:31', 2, 10, 1],
		[64, 'Pelle', '2012-07-24 19:32:30', 8, 7, 2],
		[65, 'saatana', '2012-08-10 08:56:27', 4, 10, 1],
		[66, 'Liuhu', '2012-09-15 17:06:31', 4, 10, 1],
		[67, 'Random guy', '2012-12-02 19:42:40', 8, 9, 1],
		[68, 'Anwar', '2012-12-07 11:37:06', 8, 6, 1],
		[69, 'Anwar', '2012-12-12 15:27:36', 8, 3, 1],
		[70, 'Random guy', '2013-02-07 18:16:35', 3, 10, 3],
		[71, 'Jodel', '2013-02-12 15:59:38', 8, 9, 2],
		[72, 'Spike', '2013-06-29 21:33:20', 8, 9, 1],
		[73, 'Random guy', '2013-08-30 20:31:45', 1, 10, 1],
		[74, 'Random guy', '2013-11-27 19:46:24', 1, 10, 1]
	];

	records.sort(function(a, b) {
		if(a[3] > b[3])
			return -1;
		if(a[3] < b[3])
			return 1;
		if(a[4] < b[4])
			return -1;
		if(a[4] > b[4])
			return 1;

		if(SQLtoJSDate(a[2]).getTime() < SQLtoJSDate(b[2]).getTime())
			return -1;
		return 1;
	});

	  for(let i = 0; i < records.length; i++) {
		 	let date = SQLtoJSDate(records[i][2]);
			let highScoreList = document.getElementById("highscore-list");
			highScoreList.insertAdjacentHTML("beforeend", 
			`<div class="score">
		    <div class="score-nro">${i+1}</div>
		    <div class="score-name">${records[i][1]}</div>
		    <div class="score-score">${records[i][3]} clears<br />${records[i][4]} death</div>
		    <div class="score-date">${date.getFullYear()} ${GetMonthName(date.getMonth())} ${nthDate(date.getDate())} ${date.getHours()}:${padMinutes(date.getMinutes())}</div>
		    <div style="width: 100%; clear:both"></div>
		  </div>`);
		}
}

function getLocalStorageHighscore() {
	var score = localStorage.getItem(STORAGE_ID);
	if(score == null)
		return;
	score = JSON.parse(score);
	document.getElementById("highscore-cleared").text = score.cleared;
	document.getElementById("highscore-deaths").text = score.deaths;
	document.getElementById("local-score").style.display = "block";
}

function SQLtoJSDate(stamp) {
	var t = stamp.split(/[- :]/);
	return new Date(Date.UTC(t[0], t[1]-1, t[2], t[3], t[4], t[5]));
}

function GetMonthName(i) {
	return ['January','February','March','April','May','June','July','August','September','October','November','December'][i];
}

function nthDate(day) {
	if(day == 1 || day == 21 || day == 31)
		return day + "st";
	if(day == 2 || day == 22)
		return day + "nd";
	if(day == 3 || day == 23)
		return day + "rd";
	return day + "th";
}

function padMinutes(min) {
	if(min < 10)
		return "0" + min;
	return min;
}
