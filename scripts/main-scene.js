var MainScene = pc.createScript('Main-Scene-Script');



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
			init: {
				target: 'homepage', action() {},
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
			switch: {
				target: 'lobbyClient', action() {},
			},
		},
	},
	lobbyClient: {
		actions: {
			onEnter() { lobbyClient_onEnter(); },
			onExit() { lobbyClient_onExit(); },
			onUpdate(dt) { lobbyClient_onUpdate(dt); }
		},
		transitions: {
			switch: {
				target: 'homepage', action() {},
			},
		},
	},
})

var state = machine.value;

// STATE_METHODS_START

// QR screen for host, black for client without query string
function homepage_onEnter(){}
function homepage_onUpdate(dt){}
function homepage_onExit(){}

function naming_onEnter(){}
function naming_onUpdate(dt){}
function naming_onExit(){}

function lobby_onEnter(){}
function lobby_onUpdate(dt){}
function lobby_onExit(){}

function newRound_onEnter(){}
function newRound_onUpdate(dt){}
function newRound_onExit(){}

function answering_onEnter(){}
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
var myState = {
    playerID: 0
};

var uTime = 0;
var ui_bottom, ui_top, ui_center;
var backgroundPatternShaderDef, backgroundPatternShader, backgroundPatternPlane;
var skullShaderDef, skullShader;
const allText = [];
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

    colourOffset = Math.floor(Math.random() * 100); // DELETE
    iconOffset = Math.floor(Math.random() * 100); // DELETE
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
    console.log(textToWrite);
}

var promptsObj;
async function getPrompts(){ const response = await fetch('/assets/objects/prompts.json'); promptsObj = await response.json(); };
function parsePromptText(unparsedText){
    return String(unparsedText).replaceAll('@','\n').replaceAll('^','"').replaceAll('*','\'')
}

MainScene.prototype.initialize = function() {

    ui_top = new pc.Entity('UI-Top'); app.root.addChild(ui_top);
    ui_center = new pc.Entity('UI-Center'); app.root.addChild(ui_center);
    ui_bottom = new pc.Entity('UI-Bottom'); app.root.addChild(ui_bottom);

    MainScene.prototype.createBackground();
    MainScene.prototype.createSkulls();

    const centerTextElem = new pc.Entity('CenterTextElem');
    centerTextElem.setLocalEulerAngles(90,0,0);
    ui_center.addChild(centerTextElem);

    getPrompts().then(() => {
        const indexToGet = promptsObj.length-1;
        const promptText = parsePromptText(promptsObj[indexToGet].text);
        const promptMinFontSize = promptsObj[indexToGet].minFontSize;
        const promptMaxFontSize = promptsObj[indexToGet].maxFontSize;
        const promptLineHeight = promptsObj[indexToGet].lineHeight;
        MainScene.prototype.newText(promptText,centerTextElem,[0,0.0,1],0.92,[1,1,1],0,[promptMinFontSize, promptMaxFontSize, promptLineHeight]);
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
    inputFieldElem.addEventListener("submit", (event) => {
        console.log('Submit!');
    });
    //state = machine.transition(state, 'init');

    window.addEventListener('keydown',(e) => {
        if(e.key == 'e'){ refreshSkullOffsets(); } // DELETE
        if(e.key == 'f'){ writeNewExchange("WAITING","0,1,2,3,4"); } // DELETE
    });
}
function resetInputFieldMessage(){
    inputFieldAnswerElem.innerText = "Type Here...";
};

function resetGameRoom(){
    if(w.isHost === false) return;
    w.dbSet(w.dbRef(w.db, 'game_room'), {
        game_exchange: 'RESET',
        started: false,
        icon_offset: 0,
        colour_offset: 0,
        players: {
            player_1: { exchange: "EX", name: "Name", answer_1: "A1", answer_2: "A2", score: 0 },
            player_2: { exchange: "EX", name: "Name", answer_1: "A1", answer_2: "A2", score: 0 },
            player_3: { exchange: "EX", name: "Name", answer_1: "A1", answer_2: "A2", score: 0 },
            player_4: { exchange: "EX", name: "Name", answer_1: "A1", answer_2: "A2", score: 0 },
            player_5: { exchange: "EX", name: "Name", answer_1: "A1", answer_2: "A2", score: 0 },
            player_6: { exchange: "EX", name: "Name", answer_1: "A1", answer_2: "A2", score: 0 },
            player_7: { exchange: "EX", name: "Name", answer_1: "A1", answer_2: "A2", score: 0 },
            player_8: { exchange: "EX", name: "Name", answer_1: "A1", answer_2: "A2", score: 0 }
        }
    });
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
        // newSkull.setLocalPosition(0,-10 * i,1);
        let centerArray = centeredList(i,8,9.75,[0,-10,1]);
        newSkull.setLocalPosition(centerArray[0],centerArray[1],centerArray[2]);

        skulls.push(newSkull);
    }
}
MainScene.prototype.newText = function(defaultText, parent, offset, scale, color=[1.0,1.0,1.0], fontID=0, autoSizingData=[5.2,10.2,14]) {
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
        alignment: [0.5,0.5],
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

    return textElem;
}


MainScene.prototype.update = function(dt) {
    uTime += dt;
    if(backgroundPatternPlane != null) backgroundPatternPlane.render.meshInstances[0].material.setParameter('uTime', uTime);

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

    const textScale = 1.0 * pc_dpi;
    // const textScale = 1.0;
    for (let i = 0; i < allText.length; i++) {
        const sx = allText[i].textScale[0] * textScale;
        const sy = allText[i].textScale[1] * textScale;
        const sz = allText[i].textScale[2] * textScale;
        allText[i].textElement.setLocalScale(sx,sy,sz);
    }
}

