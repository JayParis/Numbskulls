var MainScene = pc.createScript('Main-Scene-Script');
var spinOffsets = [1.50748, 1.78961, 1.368377, 1.22982, 1.124635, 1.553598, 1.127538, 1.688590]

function createMachine(stateMachineDefinition) {
	const machine = {
		value: stateMachineDefinition.initialState,
		transition(currentState, event) {
			const currentStateDefinition = stateMachineDefinition[currentState];
			const destinationTransition = currentStateDefinition.transitions[event];
			if (!destinationTransition) {
				return;
			}
			const destinationState = destinationTransition.target;
			const destinationStateDefinition = stateMachineDefinition[destinationState];

            timeInState = 0;
			destinationTransition.action();
			currentStateDefinition.actions.onExit();
			destinationStateDefinition.actions.onEnter();

			machine.value = destinationState;

			return machine.value;
		},
		update(currentState, dt) {
			const currentStateDefinition = stateMachineDefinition[currentState];
			currentStateDefinition.actions.onUpdate(dt);
		}
	}
	stateMachineDefinition[stateMachineDefinition.initialState].actions.onEnter();
	return machine;
}

const machine = createMachine({
	initialState: 'nil',
	nil: {
		actions: {
			onEnter() {  }, onExit() {  }, onUpdate(dt) {  }
		},
		transitions: {
			initHost: {
				target: 'homepage', action() {},
			},
            initClient: {
				target: 'naming', action() {},
			},
		},
	},
	homepage: {
		actions: {
			onEnter() { homepage_onEnter(); },
			onExit() { homepage_onExit(); },
			onUpdate(dt) { homepage_onUpdate(dt); }
		},
		transitions: {
			goToNaming: {
				target: 'naming', action() {},
			},
		},
	},
	naming: {
		actions: {
			onEnter() { naming_onEnter(); },
			onExit() { naming_onExit(); },
			onUpdate(dt) { naming_onUpdate(dt); }
		},
		transitions: {
			goToLobby: {
				target: 'lobby', action() {},
			},
		},
	},
    lobby: {
		actions: {
			onEnter() { lobby_onEnter(); },
			onExit() { lobby_onExit(); },
			onUpdate(dt) { lobby_onUpdate(dt); }
		},
		transitions: {
			goToRound: {
				target: 'round', action() {},
			},
		},
	},
    round: {
		actions: {
			onEnter() { newRound_onEnter(); },
			onExit() { newRound_onExit(); },
			onUpdate(dt) { newRound_onUpdate(dt); }
		},
		transitions: {
			goToAnswering: {
				target: 'answering', action() {},
			},
		},
	},
    answering: {
		actions: {
			onEnter() { answering_onEnter(); },
			onExit() { answering_onExit(); },
			onUpdate(dt) { answering_onUpdate(dt); }
		},
		transitions: {
			switch: {
				target: 'homepage', action() {},
			},
		},
	},
})

var timeInState = 0;
var state = machine.value;

function cRect(e){ return {x: e.x / canvas.getBoundingClientRect().width, y: 1.0-(e.y / canvas.getBoundingClientRect().height)} }; // FLIPS Y
// STATE_METHODS_START

// QR screen for host, black for client without query string
function homepage_onEnter(){
    setQRBackgroundVisibility(1);
    setInputVisibility(0);
    app.on('pc-home-click', (e) => {

        if(cRect(e).y > 0.8){ // Open dev menu
            setDevMenuVisibility(document.getElementById('dev-menu-id').style.display == 'none' ? 1 : 0);
        }
        if(cRect(e).y < 0.2){ // Start game
            state = machine.transition(state, 'goToNaming');
        }
    });
}
function homepage_onUpdate(dt){}
function homepage_onExit(){ app.off('pc-home-click'); }

function naming_onEnter(){
    setQRBackgroundVisibility(0);
    setDevMenuVisibility(0);
    setInputVisibility(1);
    resetInputFieldMessage();
    fadePlaneAnim([0,0,0],2);

    for (let i = 0; i < 8; i++) {
        const skull = skulls[i];
        if(i != myState.playerID){
            skull.setLocalPosition(-90,-90,-90);
            continue;
        }
        skull.setPosition(ui_center.getPosition());
        skull.setLocalScale(pc_dpi * 150,pc_dpi * 150,pc_dpi * 150);
    }

    app.on('pc-name-submit', (e) => {
        state = machine.transition(state, 'goToLobby');
        w.dbSet(w.dbRef(w.db, `game_room/players/player_${(myState.playerID+1).toString()}/name`), inputFieldElem.value);
        
        if(w.isHost){
            writeNewExchange('WAITING');
        } else {
            writeNewExchange('JOINED');
        }
    });
}
function naming_onUpdate(dt){}
function naming_onExit(){ app.off('pc-name-submit'); }

function lobby_onEnter(){
    fadePlaneAnim([0,0,0],2);
    setInputVisibility(2);
    namingEntity.setLocalPosition(0,1000,0);
    for (let i = 0; i < 8; i++) {
        skulls[i].setLocalScale(12,12,12);
    }
    calcPlayersInGame().then(() => { layoutLobbyScreen(); });
    app.on('check-lobby-size',() =>{
        calcPlayersInGame().then(() => { layoutLobbyScreen(); });
    });
    app.on('pc-lobby-click', (e) => {
        if(!w.isHost) return;
        
        if(cRect(e).y < 0.2 && timeInState > 0.5){ // Start game
            writeNewExchange('STARTING', getMatchupOrder(7,promptsObj.length));
            state = machine.transition(state, 'goToRound');
        }
    });
    app.on('move-into-round',() =>{
        state = machine.transition(state, 'goToRound');
    });
    
}
function lobby_onUpdate(dt){}
function lobby_onExit(){ app.off('check-lobby-size'); app.off('pc-lobby-click'); app.off('move-into-round'); }

var roundIntroTimer = 0.0, movedIntoAnswering = false;
function newRound_onEnter(){
    setRoundVisibility(1,myState.currentRound);
    roundIntroTimer = 0.0;
    movedIntoAnswering = false;
    setInputVisibility(0);
    for (let i = 0; i < 8; i++) {
        skulls[i].setLocalPosition(-100,-100,-100);
    }
    app.on('move-into-answering',() =>{
        state = machine.transition(state, 'goToAnswering');
    });
}
function newRound_onUpdate(dt){
    if(w.isHost){
        roundIntroTimer += dt;
        if(roundIntroTimer > 3.0 && !movedIntoAnswering){
            writeNewExchange('ANSWERING');
            state = machine.transition(state, 'goToAnswering');
            movedIntoAnswering = true;
        }
    }
    
}
function newRound_onExit(){ app.off('move-into-answering'); }

function answering_onEnter(){
    setRoundVisibility(0,myState.currentRound);
    fadePlaneAnim(lastRoundBGColour);
}
function answering_onUpdate(dt){}
function answering_onExit(){}

function reviewLoop_onEnter(){}
function reviewLoop_onUpdate(dt){}
function reviewLoop_onExit(){}

function scores_onEnter(){}
function scores_onUpdate(dt){}
function scores_onExit(){}

// STATE_METHODS_END



const w = window;
const root = document.querySelector(':root');
var handleTouch;
var myState = {
    playerID: 0,
    gameStateID: 0,
    playersInGame: 0,
    currentRound: 1,
    allPlayerNames: [
        'Jay',
        '^!*',
        '^!*',
        '^!*',
        '^!*',
        '^!*',
        '^!*',
        '^!*',
    ],
    matchups: []
};
var lastRoundBGColour = [0,0,0];
function getExchangeKeyValue(fullString){
    const spl = String(fullString).substring(1).split(':');
    return {key: spl[0], value: spl[1]}
};
async function calcPlayersInGame(){
    await new Promise((resolve) => {
        var current = 1; // Always has host
        w.dbGet(w.dbRef(w.db, 'game_room')).then((snap) => {
            const dbObj = snap.val();
            if(dbObj.block_all_traffic === true) return;
            // Skip player 1, they are host
            if(getExchangeKeyValue(dbObj.players.player_2.exchange).key == 'JOINED') {current += 1; myState.allPlayerNames[1] = dbObj.players.player_2.name}
            if(getExchangeKeyValue(dbObj.players.player_3.exchange).key == 'JOINED') {current += 1; myState.allPlayerNames[2] = dbObj.players.player_3.name}
            if(getExchangeKeyValue(dbObj.players.player_4.exchange).key == 'JOINED') {current += 1; myState.allPlayerNames[3] = dbObj.players.player_4.name}
            if(getExchangeKeyValue(dbObj.players.player_5.exchange).key == 'JOINED') {current += 1; myState.allPlayerNames[4] = dbObj.players.player_5.name}
            if(getExchangeKeyValue(dbObj.players.player_6.exchange).key == 'JOINED') {current += 1; myState.allPlayerNames[5] = dbObj.players.player_6.name}
            if(getExchangeKeyValue(dbObj.players.player_7.exchange).key == 'JOINED') {current += 1; myState.allPlayerNames[6] = dbObj.players.player_7.name}
            if(getExchangeKeyValue(dbObj.players.player_8.exchange).key == 'JOINED') {current += 1; myState.allPlayerNames[7] = dbObj.players.player_8.name}

            myState.playersInGame = current;
            resolve();
        });
    });
}
function parseMatchupString(orderString){
    const retArray = [];
    const splitString = orderString.split(',');

    for (let i = 0; i < splitString.length / 3; i++) {
        const group = [
            splitString[i*3],
            splitString[(i*3)+1],
            splitString[(i*3)+2]
        ];
        retArray.push(group);
    }
    return retArray;
}

var uTime = 0;
var ui_bottom, ui_top, ui_center;
var backgroundPatternShaderDef, backgroundPatternShader, backgroundPatternPlane;
var QRShaderDef, QRShader, QRPlane, CodePlane, titlePlane, qrSkull, namingEntity;
var RoundShaderDef, RoundShader, RoundPlane, roundTitleEntity, roundTextElement;
var fadeRect, fadePlaneAnim_t = 0.0, fadePlaneColour=[0,0,0];
var skullShaderDef, skullShader;
const allText = [];
const allLobbyTextEntities = [], allLobbyTextElements = [];
const skulls = [];
var inputFieldElem, inputFieldAnswerElem;

const playerColoursAndBW = [
    [1.0, 1.0, 1.0, 0.0],
    [0.6784, 0.0, 1.0,1.0],
    [0.0, 0.8509, 1.0,0.0],
    [1.0, 0.9921, 0.0,0.0],
    [0.0, 1.0, 0.3803,0.0],
    [1.0, 0.0, 0.2117,1.0],
    [0.0, 0.1725, 1.0,1.0],
    [1.0, 0.5294, 0.0,1.0]
];
var colourOffset = 0, iconOffset = 0;
function getPlayerColour(index) { const rIndex = mod01(index + colourOffset,8); return [playerColoursAndBW[rIndex][0], playerColoursAndBW[rIndex][1], playerColoursAndBW[rIndex][2]] };
function getPlayerTextColour(index) { const rIndex = mod01(index + colourOffset,8); const textColourValue = playerColoursAndBW[rIndex][3]; return [textColourValue,textColourValue,textColourValue] };
function refreshSkullOffsets(){
    const allSkullTextures = [assets.skullTex_1,assets.skullTex_2,assets.skullTex_3,assets.skullTex_4,assets.skullTex_5,assets.skullTex_6,assets.skullTex_7,assets.skullTex_8,];

    // colourOffset = Math.floor(Math.random() * 100); // DELETE
    // iconOffset = Math.floor(Math.random() * 100); // DELETE
    for (let i = 0; i < 8; i++){
        const skull = skulls[i];
        const rIndex = mod01(i + iconOffset,8);
        skull.render.meshInstances[0].material.setParameter('uMainTex', allSkullTextures[rIndex].resource);
        skull.render.meshInstances[0].material.setParameter('uTint', getPlayerColour(i));
    }
}
var clientUCharRoll = 0;
var clientUCharList = ['@','!','?','*','%','$','#','>','<','+']
function writeNewExchange(message, valuesAsString='x'){
    clientUCharRoll += 1;
    const textToWrite = clientUCharList[mod01(clientUCharRoll,10)] + String(message) + ':' + String(valuesAsString);
    if(w.isHost){
        w.dbSet(w.dbRef(w.db, 'game_room/game_exchange'), textToWrite);
    }else{
        w.dbSet(w.dbRef(w.db, `game_room/players/player_${(myState.playerID+1).toString()}/exchange`), textToWrite);
    }
}

var promptsObj;
async function getPrompts(){ const response = await fetch('/assets/objects/prompts.json'); promptsObj = await response.json(); };
function parsePromptText(unparsedText){
    return String(unparsedText).replaceAll('@','\n').replaceAll('^','"').replaceAll('*','\'')
}
function parseInputEvent(e){ return {x: handleTouch ? e.touches[0].clientX : e.x, y: handleTouch ? e.touches[0].clientY : e.y} };

function setInputVisibility(displayState){ // 0 = Hidden, 1 = Text entry, 2 = Finished message
    document.getElementById('answer-field-line-id').style.display = displayState == 2 ? 'none' : 'block'
    document.getElementById('input-entry-area-id').style.display = displayState == 0 ? 'none' : 'block'
    document.getElementById('input-overlay-message-id').style.display = displayState == 2 ? 'block' : 'none'
    root.style.setProperty('--border-colour', displayState == 2 ? '#353535' : '#ffffff');
}
function setQRBackgroundVisibility(displayState){
    QRPlane.enabled = displayState == 1;
    CodePlane.enabled = displayState == 1;
    titlePlane.enabled = displayState == 1;
    qrSkull.enabled = displayState == 1;
}
function setDevMenuVisibility(displayState){
    document.getElementById('dev-menu-id').style.display = displayState == 0 ? 'none' : 'block';
}


MainScene.prototype.initialize = function() {

    ui_top = new pc.Entity('UI-Top'); app.root.addChild(ui_top);
    ui_center = new pc.Entity('UI-Center'); app.root.addChild(ui_center);
    ui_bottom = new pc.Entity('UI-Bottom'); app.root.addChild(ui_bottom);

    MainScene.prototype.createBackground();
    MainScene.prototype.createQR();
    MainScene.prototype.createNamingScreen();
    MainScene.prototype.createLobbyScreen();
    MainScene.prototype.createSkulls();
    MainScene.prototype.createRoundScreen();
    MainScene.prototype.createFadePlane(); // Must be last

    const centerTextElem = new pc.Entity('CenterTextElem');
    centerTextElem.setLocalEulerAngles(90,0,0);
    ui_center.addChild(centerTextElem);

    getPrompts().then(() => {
        const indexToGet = promptsObj.prompts.length-1;
        const promptText = parsePromptText(promptsObj.prompts[indexToGet].text);
        const promptMinFontSize = promptsObj.prompts[indexToGet].minFontSize;
        const promptMaxFontSize = promptsObj.prompts[indexToGet].maxFontSize;
        const promptLineHeight = promptsObj.prompts[indexToGet].lineHeight;
        // MainScene.prototype.newText(promptText,centerTextElem,[0,0.0,1],0.92,[1,1,1],0,[promptMinFontSize, promptMaxFontSize, promptLineHeight]);
        this.resizeMethod();
    });


    window.addEventListener('resize', () => this.resizeMethod());
    window.addEventListener('orientationchange', () => this.resizeMethod());
    this.resizeMethod();

    inputFieldAnswerElem = document.getElementById('answer-field-line-id');
    inputFieldElem = document.getElementById('answer-field-id');
    inputFieldElem.addEventListener("input", (event) => {
        if(String(inputFieldElem.value).length > 2){
            inputFieldAnswerElem.innerText = "Enter to Send";
        }else{
            resetInputFieldMessage();
        }
    });
    setTimeout(() => { // DELETE
        
        // Init state and database listeners
        firstUserFocus();

        
    }, 1100);

    handleTouch = (typeof window !== 'undefined') && ('ontouchstart' in window || ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0));
    // handleTouch = false;
    // handleTouch = canvas.height > canvas.width * 1.25 && canvas.width < 815;
    
    if(handleTouch){
        window.addEventListener("touchstart", (event) => {
            app.fire('pc-home-click',parseInputEvent(event));
            app.fire('pc-lobby-click',parseInputEvent(event));
        });
    }else{
        window.addEventListener("mousedown", (event) => {
            app.fire('pc-home-click',parseInputEvent(event));
            app.fire('pc-lobby-click',parseInputEvent(event));
        });
    }
    
    window.addEventListener('keydown',(e) => {
        return;
        if(e.key == 'g'){ setRoundVisibility(1, myState.currentRound); myState.currentRound += 1; } // DELETE
        if(e.key == 'e'){
            const orderString = getMatchupOrder(7,promptsObj.length);
            const rArray = parseMatchupString(orderString);
            console.log(rArray);
        } // DELETE
        return;
        if(e.key == 'r'){ resetGameRoom(); } // DELETE
        if(e.key == 'x'){ writeNewExchange("WAITING","0,1,2,3,4"); } // DELETE
        if(e.key == 'f'){
            calcPlayersInGame().then(() => {
                // console.log('playrs: ' + c.toString());
                console.log(myState.playersInGame);
            });
        } // DELETE
    });
    if(w.isHost) resetGameRoom(); // DELETE?
}
function firstUserFocus(){
    if(w.isHost){
        for (let i = 1; i <= 8; i++) {
            w.dbOnValue(w.dbRef(w.db, `game_room/players/player_${i.toString()}/exchange`), (snap) => {
                receivedPlayerExchange(String(snap.val()),i-1);
            });
        }
        
    } else {
        w.dbGet(w.dbRef(w.db, 'player_count')).then((snap) => {
            let currentPlayerCount = parseInt(snap.val());
            
            if(currentPlayerCount >= 8) return; // Too many players, do something to prevent them playing
            myState.playerID = currentPlayerCount; // Dont sub one?
            

            const updates = {};
            updates['player_count'] = w.dbIncrement(1);
            w.dbUpdate(w.dbRef(w.db), updates);

        });
        w.dbOnValue(w.dbRef(w.db, 'game_room/game_exchange'), (snap) => { receivedGameStateExchange(String(snap.val())); });
    }

    w.dbGet(w.dbRef(w.db, 'game_room')).then((snap) => {
        const dbObj = snap.val();
        if(dbObj.block_all_traffic === true) return;

        colourOffset = dbObj.colour_offset;
        iconOffset = dbObj.icon_offset;
        refreshSkullOffsets();

        state = machine.transition(state, w.isHost ? 'initHost' : 'initClient');
    });
}

function resetInputFieldMessage(){
    inputFieldAnswerElem.innerText = myState.gameStateID == 0 ? "Name..." : "Answer Here...";
};

function resetGameRoom(bypass=false){
    if(w.isHost === false && !bypass) return;
    w.dbSet(w.dbRef(w.db, 'player_count'), 1);
    w.dbSet(w.dbRef(w.db, 'game_room'), {
        game_exchange: '^RESET:x',
        started: false,
        block_all_traffic: false,
        icon_offset: 0,
        colour_offset: 0,
        players: {
            player_1: { exchange: "^NIL:x", name: "NIL", answer_1: "A1", answer_2: "A2", score: 0 },
            player_2: { exchange: "^NIL:x", name: "NIL", answer_1: "A1", answer_2: "A2", score: 0 },
            player_3: { exchange: "^NIL:x", name: "NIL", answer_1: "A1", answer_2: "A2", score: 0 },
            player_4: { exchange: "^NIL:x", name: "NIL", answer_1: "A1", answer_2: "A2", score: 0 },
            player_5: { exchange: "^NIL:x", name: "NIL", answer_1: "A1", answer_2: "A2", score: 0 },
            player_6: { exchange: "^NIL:x", name: "NIL", answer_1: "A1", answer_2: "A2", score: 0 },
            player_7: { exchange: "^NIL:x", name: "NIL", answer_1: "A1", answer_2: "A2", score: 0 },
            player_8: { exchange: "^NIL:x", name: "NIL", answer_1: "A1", answer_2: "A2", score: 0 }
        }
    });
}
function receivedGameStateExchange(dataString){
    console.log('FROM GAME: ' + dataString);
    if(getExchangeKeyValue(dataString).key == 'WAITING') app.fire('check-lobby-size');
    if(getExchangeKeyValue(dataString).key == 'STARTING'){
        myState.matchups = parseMatchupString(getExchangeKeyValue(dataString).value);
        console.log(myState.matchups);
        app.fire('move-into-round');
    }
    if(getExchangeKeyValue(dataString).key == 'ANSWERING') app.fire('move-into-answering');
}
function receivedPlayerExchange(dataString, playerIndex){
    console.log(`FROM PLAYER ${playerIndex+1}: ` + dataString);
    if(getExchangeKeyValue(dataString).key == 'JOINED') {app.fire('check-lobby-size'); writeNewExchange('WAITING');}
}

MainScene.prototype.createBackground = function(){

    backgroundPatternShaderDef = {
        attributes: {
            vVertex: pc.SEMANTIC_POSITION,
            vNormal: pc.SEMANTIC_NORMAL,
            vTexCoord: pc.SEMANTIC_TEXCOORD0
        },
        vshader: assets.backgroundVS.resource,
        fshader: assets.backgroundFS.resource
    };
    backgroundPatternShader = new pc.Shader(device, backgroundPatternShaderDef);

    backgroundPatternPlane = new pc.Entity('Background');
    backgroundPatternPlane.addComponent('render', { type: 'plane' });
    backgroundPatternPlane.setLocalPosition(0,0,-1);
    backgroundPatternPlane.setLocalEulerAngles(90,0,0);

    backgroundPatternPlane.render.meshInstances[0].material = new pc.Material();
    backgroundPatternPlane.render.meshInstances[0].material.shader = backgroundPatternShader;
    
    app.root.addChild(backgroundPatternPlane);
};
MainScene.prototype.createQR = function(){

    QRShaderDef = {
        attributes: {
            vVertex: pc.SEMANTIC_POSITION,
            vNormal: pc.SEMANTIC_NORMAL,
            vTexCoord: pc.SEMANTIC_TEXCOORD0
        },
        vshader: assets.qrVS.resource,
        fshader: assets.qrFS.resource
    };
    QRShader = new pc.Shader(device, QRShaderDef);

    QRPlane = new pc.Entity('QR-Background');
    QRPlane.addComponent('render', { type: 'plane' });
    QRPlane.setLocalPosition(0,0,1);
    QRPlane.setLocalEulerAngles(90,0,0);

    QRPlane.render.meshInstances[0].material = new pc.Material();
    QRPlane.render.meshInstances[0].material.shader = QRShader;
    
    app.root.addChild(QRPlane);

    CodePlane = new pc.Entity('QR-Code');
    CodePlane.addComponent('render', { type: 'plane' });
    CodePlane.setLocalPosition(0,0,1.2);
    CodePlane.setLocalEulerAngles(90,0,0);
    CodePlane.render.meshInstances[0].material = new pc.BasicMaterial();
    CodePlane.render.meshInstances[0].material.blendType = pc.BLEND_NORMAL;
    CodePlane.render.meshInstances[0].material.colorMap = assets.qrTex.resource;
    // CodePlane.render.meshInstances[0].material.color = new pc.Color(0,0,0,1);
    CodePlane.setLocalScale(10,10,10);
    
    app.root.addChild(CodePlane);


    revRainbowShaderDef = {
        attributes: {
            vVertex: pc.SEMANTIC_POSITION,
            vNormal: pc.SEMANTIC_NORMAL,
            vTexCoord: pc.SEMANTIC_TEXCOORD0
        },
        vshader: assets.reverseRainbowVS.resource,
        fshader: assets.reverseRainbowFS.resource
    };
    revRainbowShader = new pc.Shader(device, revRainbowShaderDef);

    titlePlane = new pc.Entity('Title');
    titlePlane.addComponent('render', { type: 'plane' });
    titlePlane.setLocalPosition(0,0,1.3);
    titlePlane.setLocalEulerAngles(90,0,0);
    titlePlane.setLocalScale(576.0 * 0.013, 1, 92.25 * 0.013);
    titlePlane.render.meshInstances[0].material = new pc.Material();
    titlePlane.render.meshInstances[0].material.shader = revRainbowShader;
    titlePlane.render.meshInstances[0].material.blendType = pc.BLEND_NORMAL;
    titlePlane.render.meshInstances[0].material.setParameter('uMainTex',assets.titleTex.resource);
    // titlePlane.render.meshInstances[0].material.colorMap = assets.titleTex.resource;
    // titlePlane.render.meshInstances[0].material.color = new pc.Color(0,0,0,0.5);

    // app.root.addChild(titlePlane);

    qrSkull = new pc.Entity('QR-Skull');
    qrSkull.addComponent('render', { type: 'plane' });
    qrSkull.setLocalPosition(0,0,1.4);
    qrSkull.setLocalEulerAngles(90,0,0);
    qrSkull.setLocalScale(2,2,2);
    qrSkull.render.meshInstances[0].material = new pc.Material();
    qrSkull.render.meshInstances[0].material.shader = revRainbowShader;
    qrSkull.render.meshInstances[0].material.blendType = pc.BLEND_NORMAL;
    qrSkull.render.meshInstances[0].material.setParameter('uMainTex',assets.skullTex_3.resource);
    // qrSkull.render.meshInstances[0].material.color = new pc.Color(0,0,0,0.5);
    
    app.root.addChild(qrSkull);
};
MainScene.prototype.createNamingScreen = function(){

    namingEntity = new pc.Entity('Naming-Entity');
    namingEntity.setLocalEulerAngles(90,0,0);
    ui_center.addChild(namingEntity);
    namingEntity.setLocalPosition(0,33,0);
    const listOfNameGreetings = ['So, what should\n we call you?','A name, if you please...'];
    const nameGreeting = listOfNameGreetings[Math.floor(Math.random() * listOfNameGreetings.length * 0.99999)];
    MainScene.prototype.newText(nameGreeting,namingEntity,[0,0.0,1],0.92,[1,1,1],0);
    this.resizeMethod();

    // namingSkull = new pc.Entity('QR-Skull');
    // namingSkull.addComponent('render', { type: 'plane' });
    // namingSkull.setLocalPosition(0,0,1.4);
    // namingSkull.setLocalEulerAngles(90,0,0);
    // namingSkull.setLocalScale(2,2,2);
    // namingSkull.render.meshInstances[0].material = new pc.Material();
    // namingSkull.render.meshInstances[0].material.shader = skullShader;
    // namingSkull.render.meshInstances[0].material.blendType = pc.BLEND_NORMAL;
    // namingSkull.render.meshInstances[0].material.setParameter('uMainTex',assets.skullTex_3.resource);
};
MainScene.prototype.createLobbyScreen = function() {
    for (let i = 0; i < 8; i++) {
        const newLobbyTextEntity = new pc.Entity('Lobby-Text-Entity');
        newLobbyTextEntity.setLocalEulerAngles(90,0,0);
        ui_center.addChild(newLobbyTextEntity);
        newLobbyTextEntity.setLocalPosition(0,-1033,0);
        MainScene.prototype.newText("GRT: " + i.toString(),newLobbyTextEntity,[0,0.0,1],0.92,[1,1,1],0,[5.2,5.2,14],true);
        allLobbyTextEntities.push(newLobbyTextEntity);
    }
};
function layoutLobbyScreen(){
    var numberOfPlayers = myState.playersInGame;
    var spacing = [
        0.75, // 1
        24.75, // 2
        20.75, // 3
        15.75, // 4
        15.75, // 5
        12.75, // 6
        11.75, // 7
        10.75, // 8
    ]
    for (let i = 0; i < 8; i++) {
    // for (let i = 7; i >= 0; i--) {
        if(i >= numberOfPlayers){
            allLobbyTextEntities[i].setLocalPosition(1000,1000,1000);
            skulls[i].setLocalPosition(1000,1000,1000);
            continue;
        }
        let centerTextArray = centeredList(numberOfPlayers-i, numberOfPlayers, spacing[numberOfPlayers-1], [25,0,1],false);
        allLobbyTextEntities[i].setLocalPosition(centerTextArray[0],centerTextArray[1],centerTextArray[2]);
        skulls[i].setPosition(allLobbyTextEntities[i].getPosition().x - (52 * pc_dpi), allLobbyTextEntities[i].getPosition().y, allLobbyTextEntities[i].getPosition().z);
        const textColour = getPlayerColour(i);
        allLobbyTextElements[i].element.color = new pc.Color(textColour[0],textColour[1],textColour[2],1.0);
        allLobbyTextElements[i].element.text = myState.allPlayerNames[i];
        
    }
}
MainScene.prototype.createSkulls = function(){
    skullShaderDef = {
        attributes: {
            vVertex: pc.SEMANTIC_POSITION,
            vNormal: pc.SEMANTIC_NORMAL,
            vTexCoord: pc.SEMANTIC_TEXCOORD0
        },
        vshader: assets.skullVS.resource,
        fshader: assets.skullFS.resource
    };
    skullShader = new pc.Shader(device, skullShaderDef);

    const allSkullTextures = [assets.skullTex_1,assets.skullTex_2,assets.skullTex_3,assets.skullTex_4,assets.skullTex_5,assets.skullTex_6,assets.skullTex_7,assets.skullTex_8,];

    for (let i = 0; i < 8; i++) {
        const newSkull = new pc.Entity('Skull');
        newSkull.addComponent('render', { type: 'plane' });
        newSkull.setLocalEulerAngles(90,0,0);
        newSkull.render.meshInstances[0].material = new pc.Material();
        newSkull.render.meshInstances[0].material.shader = skullShader;
        newSkull.render.meshInstances[0].material.blendType = pc.BLEND_NORMAL;
        const rIndex = mod01(i + iconOffset,8);
        newSkull.render.meshInstances[0].material.setParameter('uMainTex', allSkullTextures[rIndex].resource);
        newSkull.render.meshInstances[0].material.setParameter('uTint', getPlayerColour(i));
        newSkull.render.meshInstances[0].material.setParameter('uAlpha', 1); // 0.125
        ui_top.addChild(newSkull);
        newSkull.setLocalScale(8,8,8);
        newSkull.setLocalPosition(0,-10 * i,1);
        let centerArray = centeredList(i,8,9.75,[0,1010,1]);
        newSkull.setLocalPosition(centerArray[0],centerArray[1],centerArray[2]);

        skulls.push(newSkull);
    }
};
MainScene.prototype.createFadePlane = function(){

    fadeRect = new pc.Entity("Fade-Rect");
    fadeRect.addComponent("element", {
        pivot: new pc.Vec2(0.5, 0.5),
        anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
        width: 350,
        height: 350,
        type: pc.ELEMENTTYPE_IMAGE,
        color: new pc.Color(0.0, 0.0, 0.0, 0.0),
        opacity: 0.0,
        // texture: assets.testLogo.resource
    });
    fadeRect.setPosition(0,0,8.5);
    fadeRect.setLocalScale(.1,.1,.1);
    screen.addChild(fadeRect);
};
function fadePlaneAnim(colour=[0,0,0],start_t=1.0){
    fadePlaneColour = colour;
    fadeRect.element.color = new pc.Color(fadePlaneColour[0],fadePlaneColour[1],fadePlaneColour[2],1.0);
    fadePlaneAnim_t = start_t;
}
MainScene.prototype.createRoundScreen = function(){
    RoundShaderDef = {
        attributes: {
            vVertex: pc.SEMANTIC_POSITION,
            vNormal: pc.SEMANTIC_NORMAL,
            vTexCoord: pc.SEMANTIC_TEXCOORD0
        },
        vshader: assets.roundVS.resource,
        fshader: assets.roundFS.resource
    };
    RoundShader = new pc.Shader(device, RoundShaderDef);

    RoundPlane = new pc.Entity('Round-Background');
    RoundPlane.addComponent('render', { type: 'plane' });
    RoundPlane.setLocalPosition(0,0,6);
    RoundPlane.setLocalEulerAngles(90,0,0);

    RoundPlane.render.meshInstances[0].material = new pc.Material();
    RoundPlane.render.meshInstances[0].material.shader = RoundShader;
    RoundPlane.render.meshInstances[0].material.setParameter('uRoundColourA',[0,0,0]);
    RoundPlane.render.meshInstances[0].material.setParameter('uRoundColourB',[1,1,1]);
    RoundPlane.enabled = false;
    
    app.root.addChild(RoundPlane);

    roundTitleEntity = new pc.Entity('Naming-Entity');
    roundTitleEntity.setLocalEulerAngles(90,0,0);
    // ui_center.addChild(roundTitleEntity);
    app.root.addChild(roundTitleEntity);
    roundTitleEntity.setLocalPosition(1000,-0.2,7); // 0,-0.2,7
    MainScene.prototype.newText("Round",roundTitleEntity,[0,0,0],0.92,[1,1,1],0,[15.2,15.2,14]);
};
const roundColourPairs = [
    [0.84, 1.0, 0.06], [1.0, 0.0, 0.88],
    [1.0, 0.37, 0.06], [0.47, 0.0, 1.0],
    [1.0, 0.06, 0.06], [0.48, 1.0, 0.47],
    [0.28, 0.06, 1.0], [0.48, 1.0, 0.47],
    [1.0, 0.31, 0.71], [0.69, 0.89, 1.0],
]
function setRoundVisibility(displayState, roundNumber=1){
    RoundPlane.enabled = displayState == 1;
    if(displayState == 1){
        roundTitleEntity.setLocalPosition(0,-0.2,7);
    }else{
        roundTitleEntity.setLocalPosition(1000,-0.2,7);
    }
    roundTextElement.element.text = "Round " + roundNumber.toString();
    const rIndex = mod01(roundNumber + colourOffset, roundColourPairs.length/2);
    if(displayState == 1){
        const roundAccent_1 = roundColourPairs[rIndex*2];
        const roundAccent_2 = roundColourPairs[(rIndex*2)+1];
        RoundPlane.render.meshInstances[0].material.setParameter('uRoundColourA',roundAccent_1);
        RoundPlane.render.meshInstances[0].material.setParameter('uRoundColourB',roundAccent_2);
        roundTextElement.element.color = new pc.Color(roundAccent_2[0],roundAccent_2[1],roundAccent_2[2]);
        lastRoundBGColour = roundAccent_1;
        fadePlaneAnim(roundAccent_1);
    }
}
MainScene.prototype.newText = function(defaultText, parent, offset, scale, color=[1.0,1.0,1.0], fontID=0, autoSizingData=[5.2,10.2,14], leftAlign=false) {
    // defaultText = "d";
    const fontRef = [assets.PPMoriSemiBold.resource];

    const textElem = new pc.Entity('Text');
    textElem.addComponent('element', {
        pivot: new pc.Vec2(0.5, 0.5),
        anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
        type: pc.ELEMENTTYPE_TEXT,
        font: fontRef[fontID] ,
        // fontSize: 10.2,
        minFontSize: autoSizingData[0],
        maxFontSize: autoSizingData[1],
        text: defaultText,
        color: color,
        alignment: leftAlign ? [0.0,0.5] : [0.5,0.5],
        autoWidth: false,
        autoFitWidth: true,
        width: 92,
        wrapLines: true,
        lineHeight: autoSizingData[2]
    });
    textElem.setPosition(0,0,5);
    textElem.setLocalScale(.1,.1,.1);
    if(fontID != 10) screen.addChild(textElem);

    const newTextObject = {
        textElement: textElem,
        worldSpaceTarget: parent,
        textOffset: offset,
        textScale: [scale,scale,scale],
    }
    allText.push(newTextObject);
    if(leftAlign) allLobbyTextElements.push(textElem);
    if(defaultText == 'Round') roundTextElement = textElem;

    return textElem;
};

function resetUTime(){uTime = 0;}
MainScene.prototype.update = function(dt) {
    uTime += dt;
    timeInState += dt;
    
    if(uTime > 600) resetUTime();
    if(backgroundPatternPlane != null) backgroundPatternPlane.render.meshInstances[0].material.setParameter('uTime', uTime);
    if(QRPlane != null) QRPlane.render.meshInstances[0].material.setParameter('uTime', uTime);

    machine.update(state, dt);

    for (let i = 0; i < allText.length; i++) {
        const p = new pc.Vec3(allText[i].textOffset[0],allText[i].textOffset[1],allText[i].textOffset[2]);
        const m = allText[i].worldSpaceTarget.getWorldTransform();
        const fPos = m.transformPoint(p);

        const textPos = allText[i].worldSpaceTarget.getPosition().add(new pc.Vec3(
            allText[i].textOffset[0],allText[i].textOffset[1],allText[i].textOffset[2]
        ));

        allText[i].textElement.setPosition(fPos);
        const rot = allText[i].worldSpaceTarget.getEulerAngles();
        allText[i].textElement.setEulerAngles(rot.x-90,rot.y,rot.z);
    }

    for (let i = 0; i < skulls.length; i++) {
        const skull = skulls[i];
        let rot = Math.sin(uTime * spinOffsets[i]) * 20;
        skull.setLocalEulerAngles(90,0,rot);
    }

    if(fadePlaneAnim_t > 0){
        fadePlaneAnim_t -= dt * 3;
        fadeRect.element.opacity = clamp1(fadePlaneAnim_t,0,1);
    }else{
        fadePlaneAnim_t = 0;
        if(fadeRect.element.opacity != 0){
            fadeRect.element.opacity = 0;
        }
    }
}

MainScene.prototype.swap = function(old) {}

var pc_dpi = 1;
MainScene.prototype.resizeMethod = function() {
    const orthoHeight = camera.camera.orthoHeight;
    const dim = [canvas.clientWidth,canvas.clientHeight];
    const bounds = document.getElementById('dpi-div').getBoundingClientRect();

    var portrait = dim[1] / dim[0] > 1.25;

    var boundsIntoWidth = dim[0] / bounds.width;
    var extraScale_t = 0;
    if(boundsIntoWidth < 10)
        extraScale_t = clamp1((boundsIntoWidth * 0.005)-0.5,0,1);
    else
        extraScale_t = clamp1((boundsIntoWidth * 0.05)-0.5,0,1);

    var extraScale = lerp1(portrait ? 1 : 0.85,1.5,extraScale_t);
    if(portrait && boundsIntoWidth > 10) extraScale *= 1.25;
    pc_dpi = (bounds.height / dim[1]) * extraScale;
    if(portrait && boundsIntoWidth < 5) pc_dpi = (dim[0] / dim[1]) * 0.233;

    var invalid = boundsIntoWidth < 10 & dim[0] / dim[1] > 1.9; // Improve this
    if(invalid) pc_dpi = 100;

    ui_top.setLocalScale(pc_dpi,pc_dpi,pc_dpi);
    ui_center.setLocalScale(pc_dpi,pc_dpi,pc_dpi);
    // ui_center.setLocalScale(orthoHeight,orthoHeight,orthoHeight);
    ui_bottom.setLocalScale(pc_dpi,pc_dpi,pc_dpi);

    var pushdown = dim[1] / dim[0];
    if(boundsIntoWidth < 5) pushdown = (pushdown * 0.5)-0.75;
    ui_top.setPosition(0,orthoHeight-pushdown,0);
    ui_center.setPosition(0,0,0);
    ui_bottom.setPosition(0,-(orthoHeight-pushdown),0);

    if(backgroundPatternPlane != null) backgroundPatternPlane.setLocalScale(orthoHeight * (dim[0] / dim[1]) * 2,1,orthoHeight * 2);
    if(QRPlane != null) {
        QRPlane.setLocalScale(orthoHeight * (dim[0] / dim[1]) * 2,1,orthoHeight * 2);
        QRPlane.render.meshInstances[0].material.setParameter('uScreenResolution', [canvas.width,canvas.height]);
        let codeScale = (dim[0] / dim[1]) * 16.5; // 13.5
        CodePlane.setLocalScale(codeScale,codeScale,codeScale);
        titlePlane.setLocalScale(codeScale, codeScale, codeScale * 0.16015625);
        titlePlane.setLocalPosition(0,(codeScale / 2) + 0.6,1.3);
        qrSkull.setLocalScale(codeScale * 0.25,codeScale * 0.25,codeScale * 0.25);
    }
    if(RoundPlane != null) RoundPlane.setLocalScale(orthoHeight * (dim[0] / dim[1]) * 2,1,orthoHeight * 2);

    const textScale = 1.0 * pc_dpi;
    // const textScale = 1.0;
    for (let i = 0; i < allText.length; i++) {
        const sx = allText[i].textScale[0] * textScale;
        const sy = allText[i].textScale[1] * textScale;
        const sz = allText[i].textScale[2] * textScale;
        allText[i].textElement.setLocalScale(sx,sy,sz);
    }
}

