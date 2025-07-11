/**
 * Blockly Games: Pond Database
 *
 * Copyright 2014 Google Inc.
 * https://github.com/google/blockly-games
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Creates a multi-user pond (duck page).
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Pond.Duck');

goog.require('BlocklyDialogs');
goog.require('BlocklyGames');
goog.require('BlocklyInterface');
goog.require('Pond');
goog.require('Pond.Battle');
goog.require('Pond.Blocks');
goog.require('Pond.Duck.soy');
goog.require('Pond.Visualization');
goog.require('goog.events');
goog.require('goog.ui.Tab');
goog.require('goog.ui.TabBar');


BlocklyGames.NAME = 'pond-duck';

/**
 * Is the blocks editor the program source (true) or is the JS editor
 * the program source (false).
 * @private
 */
Pond.Duck.blocksEnabled_ = false;

/**
 * ACE editor fires change events even on programatically caused changes.
 * This property is used to signal times when a programatic change is made.
 */
Pond.Duck.ignoreEditorChanges_ = true;

/**
 * Multiplayer default code
 */
// Pond.Duck.defaultCode = "//player1\nswim(270, 10);\n//player2\nvar pos;\npos = 0;\nwhile (pos <= 360) {\n  if (scan(pos) <= 70) {\n    cannon(pos, scan(pos));\n    swim(pos + 60);\n    pos += -10;\n  }\n  if (getX() >= 90) {\n    swim(180);\n  } else if (getX() <= 10) {\n    swim(0);\n\n  } else if (getY() <= 10) {\n    swim(90);\n  } else if (getY() >= 90) {\n    swim(270);\n  } else if (speed() == 0) {\n    swim(Math.random() * 360);\n  }\n  pos += 5;\n  if (pos > 360) {\n    pos = 0;\n  }\n}\n";
Pond.Duck.defaultCode = "//player1\nswim(270, 10);\n//player2\nvar pos;pos = 0;while (pos <= 360) {  if (scan(pos) <= 70) {    cannon(pos, scan(pos));    swim(pos + 60);    pos += -10;  }  if (getX() >= 90) {    swim(180);  } else if (getX() <= 10) {    swim(0);  } else if (getY() <= 10) {    swim(90);  } else if (getY() >= 90) {    swim(270);  } else if (speed() == 0) {    swim(Math.random() * 360);  }  pos += 5;  if (pos > 360) {    pos = 0;  }}";

/**
 * Initialize Ace and the pond.  Called on page load.
 */
Pond.Duck.init = function() {
  // Render the Soy template.
  document.body.innerHTML = Pond.Duck.soy.start({}, null,
      {lang: BlocklyGames.LANG,
       html: BlocklyGames.IS_HTML});

  Pond.init();

  // Setup the tabs.
  Pond.Duck.tabbar = new goog.ui.TabBar();
  Pond.Duck.tabbar.decorate(document.getElementById('tabbar'));

  var rtl = BlocklyGames.isRtl();
  var visualization = document.getElementById('visualization');
  var tabDiv = document.getElementById('tabarea');
  var blocklyDiv = document.getElementById('blockly');
  var editorDiv = document.getElementById('editor');
  var divs = [blocklyDiv, editorDiv];
  var onresize = function(e) {
    var top = visualization.offsetTop;
    tabDiv.style.top = (top - window.pageYOffset) + 'px';
    tabDiv.style.left = rtl ? '10px' : '420px';
    tabDiv.style.width = (window.innerWidth - 440) + 'px';
    var divTop =
        Math.max(0, top + tabDiv.offsetHeight - window.pageYOffset) + 'px';
    var divLeft = rtl ? '10px' : '420px';
    var divWidth = (window.innerWidth - 440) + 'px';
    for (var i = 0, div; div = divs[i]; i++) {
      div.style.top = divTop;
      div.style.left = divLeft;
      div.style.width = divWidth;
    }
  };
  window.addEventListener('scroll', function() {
    onresize(null);
    Blockly.svgResize(BlocklyGames.workspace);
  });
  window.addEventListener('resize', onresize);
  onresize(null);

  // Handle SELECT events dispatched by tabs.
  goog.events.listen(Pond.Duck.tabbar, goog.ui.Component.EventType.SELECT,
      function(e) {
        var index = e.target.getParent().getSelectedTabIndex();
        Pond.Duck.changeTab(index);
      });

  //var defaultCode = "cannon(270, 50)";
  var defaultCode = Pond.Duck.defaultCode;

  BlocklyInterface.editor = window['ace']['edit']('editor');
  BlocklyInterface.editor['setTheme']('ace/theme/chrome');
  BlocklyInterface.editor['setShowPrintMargin'](false);
  var session = BlocklyInterface.editor['getSession']();
  session['setMode']('ace/mode/javascript');
  session['setTabSize'](2);
  session['setUseSoftTabs'](true);
  session['on']('change', Pond.Duck.editorChanged);
  BlocklyInterface.editor['setValue'](defaultCode, -1);

  // Inject Blockly.
  var toolbox = document.getElementById('toolbox');
  BlocklyGames.workspace = Blockly.inject('blockly',
      {'media': 'third-party/blockly/media/',
       'rtl': false,
       'toolbox': toolbox,
       'trashcan': true,
       'zoom': {'controls': true, 'wheel': true}});
  Blockly.JavaScript.addReservedWords('scan,cannon,drive,swim,stop,speed,' +
      'damage,health,loc_x,getX,loc_y,getY,');
  var defaultXml =
      '<xml>' +
      '  <block type="pond_cannon" x="70" y="70">' +
      '    <value name="DEGREE">' +
      '      <shadow type="pond_math_number">' +
      '        <mutation angle_field="true"></mutation>' +
      '        <field name="NUM">0</field>' +
      '      </shadow>' +
      '    </value>' +
      '    <value name="RANGE">' +
      '      <shadow type="pond_math_number">' +
      '        <mutation angle_field="false"></mutation>' +
      '        <field name="NUM">70</field>' +
      '      </shadow>' +
      '    </value>' +
      '  </block>' +
      '</xml>';
  var xml = Blockly.Xml.textToDom(defaultXml);
  // Clear the workspace to avoid merge.
  BlocklyGames.workspace.clear();
  Blockly.Xml.domToWorkspace(xml, BlocklyGames.workspace);
  BlocklyGames.workspace.clearUndo();

  var players = [
    {
      start: new goog.math.Coordinate(20, 80),
      damage: 0,
      name: 'Pond_myName',
      code: null
    },
    {
      start: new goog.math.Coordinate(80, 20),
      damage: 0,
      name: 'Pond_rookName',
      code: null //'playerRook'
    }
  ];

  for (var playerData, i = 0; playerData = players[i]; i++) {
    if (playerData.code) {
      var div = document.getElementById(playerData.code);
      var code = div.textContent;
    } else {
      var code = function() {
        if (Pond.Duck.blocksEnabled_) {
          return Blockly.JavaScript.workspaceToCode(BlocklyGames.workspace);
        } else {
          return BlocklyInterface.editor['getValue']();
        }
      };
    }
    var name = BlocklyGames.getMsg(playerData.name);
    Pond.Battle.addAvatar(name, code, playerData.start, playerData.damage);
  }
  Pond.reset();
  Pond.Duck.changeTab(1);
  Pond.Duck.ignoreEditorChanges_ = false;
};

/**
 * Called by the tab bar when a tab is selected.
 * @param {number} index Which tab is now active (0-2).
 */
Pond.Duck.changeTab = function(index) {
  var BLOCKS = 0;
  var JAVASCRIPT = 1;
  // Show the correct tab contents.
  var names = ['blockly', 'editor'];
  for (var i = 0, name; name = names[i]; i++) {
    var div = document.getElementById(name);
    div.style.visibility = (i == index) ? 'visible' : 'hidden';
  }
  // Show/hide Blockly divs.
  var names = ['.blocklyTooltipDiv', '.blocklyToolboxDiv'];
  for (var i = 0, name; name = names[i]; i++) {
    var div = document.querySelector(name);
    div.style.visibility = (index == BLOCKS) ? 'visible' : 'hidden';
  }
  // Synchronize the documentation popup.
  document.getElementById('docsButton').disabled = false;
  BlocklyGames.LEVEL = (index == BLOCKS) ? 11 : 12;
  if (Pond.isDocsVisible_) {
    var frame = document.getElementById('frameDocs');
    frame.src = 'pond/docs.html?lang=' + BlocklyGames.LANG +
        '&mode=' + BlocklyGames.LEVEL;
  }
  // Synchronize the JS editor.
  if (index == JAVASCRIPT && Pond.Duck.blocksEnabled_) {
    var code = Blockly.JavaScript.workspaceToCode(BlocklyGames.workspace);
    Pond.Duck.ignoreEditorChanges_ = true;
    BlocklyInterface.editor['setValue'](code, -1);
    Pond.Duck.ignoreEditorChanges_ = false;
  }
};

/**
 * Change event for JS editor.  Warn the user, then disconnect the link from
 * blocks to JavaScript.
 */
Pond.Duck.editorChanged = function() {
  if (Pond.Duck.ignoreEditorChanges_) {
    return;
  }
  if (Pond.Duck.blocksEnabled_) {
    if (!BlocklyGames.workspace.getTopBlocks(false).length ||
        confirm(BlocklyGames.getMsg('Games_breakLink'))) {
      // Break link betweeen blocks and JS.
      Pond.Duck.tabbar.getChildAt(0).setEnabled(false);
      Pond.Duck.blocksEnabled_ = false;
    } else {
      // Abort change, preserve link.
      var code = Blockly.JavaScript.workspaceToCode(BlocklyGames.workspace);
      Pond.Duck.ignoreEditorChanges_ = true;
      BlocklyInterface.editor['setValue'](code, -1);
      Pond.Duck.ignoreEditorChanges_ = false;
    }
  } else {
    var code = BlocklyInterface.editor['getValue']();
    if (!code.trim()) {
      // Reestablish link between blocks and JS.
      BlocklyGames.workspace.clear();
      Pond.Duck.tabbar.getChildAt(0).setEnabled(true);
      Pond.Duck.blocksEnabled_ = true;
    }
  }
};

window.addEventListener('load', Pond.Duck.init);
