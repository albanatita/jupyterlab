// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/*/// <reference path='../../typings/node.d.ts' />
/// <reference path='../../typings/ws.d.ts' />
'use strict';

import WebSocket = require('ws');
 */

import {
	Context
}
from './floatContext';

import {
	INotebookTracker
}
from '../notebook/index';

import {
	INotebookModel
}
from '../notebook/notebook/model';

import {
	IDocumentContext
}
from '../docregistry';

import {
	showDialog
}
from '../dialog';

import {
	IClipboard
}
from '../clipboard';

import {
	IKernel,
	ISession
}
from 'jupyter-js-services';

import {
	Menu
}
from 'phosphor/lib/ui/menu';

import {
	JupyterLab,
	JupyterLabPlugin
}
from '../application';

import {
	ICommandPalette
}
from '../commandpalette';

import {
	selectKernel
}
from '../docregistry';

import {
	IInspector
}
from '../inspector';

import {
	IMainMenu
}
from '../mainmenu';

import {
	IRenderMime
}
from '../rendermime';

import {
	IServiceManager
}
from '../services';


import {
	NotebookPanel
}
from '../notebook/notebook/panel';

import {
	ChatManager
}
from './chatManager';

import {
	ToolbarItems
}
from '../notebook/notebook/default-toolbar';

import {
	NotebookModel
}
from '../notebook/notebook/model';

/**
 * The chat extension.
 */
export
const chatExtension : JupyterLabPlugin < void >  = {
	id : 'jupyter.extensions.chat',
	requires : [
		IServiceManager,
		IRenderMime,
		IMainMenu,
		IInspector,
		ICommandPalette,
		IClipboard,
		NotebookPanel.IRenderer,
		INotebookTracker
	],
	activate : activateChat,
	autoStart : true
};

/**
 * The class name for all main area landscape tab icons.
 */
const LANDSCAPE_ICON_CLASS = 'jp-MainAreaLandscapeIcon';

/**
 * The class name for the console icon from the default theme.
 */
const CONSOLE_ICON_CLASS = 'jp-ImageConsole';

/**
 * Activate the console extension.
 */
function activateChat(app : JupyterLab, services : IServiceManager, rendermime : IRenderMime, mainMenu : IMainMenu, inspector : IInspector, palette : ICommandPalette, clipboard : IClipboard, renderer : NotebookPanel.IRenderer, tracker : INotebookTracker) : void {

	// let tracker = new WidgetTracker<NotebookPanel>();
	let manager = services;
	let {
		commands,
		keymap
	} = app;
	let category = 'Chat';
/* 	let contextManager = new FloatContextManager({
			manager : manager
		}); */
	let specs = services.kernelspecs;
	console.log(specs.kernelspecs);
	let kernelName = specs.default;

		let menu = new Menu({
				commands,
				keymap
			});
		menu.title.label = 'Chat';

		let submenu:
		Menu = null;
	let command : string;

	// Set the source of the code inspector to the current console.
/* 	tracker.activeWidgetChanged.connect((sender : any, panel : NotebookPanel) => {
		inspector.source = panel.content.inspectionHandler;
	}); */

	// Set the main menu title.
	menu.title.label = 'Chat';

	// Add the ability to create new consoles for each kernel.
	/*  let specs = services.kernelspecs;
	let kernelName=specs.kernelspecs[0].spec.display_name;
	console.log(kernelName);*/
	let counter = 0;

	command = 'chat:connect';
	commands.addCommand(command, {
		label : 'Connect to a channel',
		execute : () => {
			counter = counter + 1;

			let path = `Chat-${counter}`;
			//manager.startNew({ path:path, kernelName:kernelName }).then(session => {
			let model = new NotebookModel();
			//var id = contextManager.createNew(path, model);
			let panel = new NotebookPanel({
					rendermime,
					clipboard : clipboard,
					renderer : renderer
				});
			let context=new Context({
				  manager: this._serviceManager,
				  model:model,
				  path:path
				});
			context.startSession({
				path : 'toto',
				kernelName : kernelName
			});
			panel.context = context;
			panel.content.model = model;
			let chatManager = new ChatManager(panel);
			chatManager.model = model;
			ToolbarItems.populateDefaults(panel);
			panel.title.label = `${path} `;
			panel.title.closable = true;
			panel.title.icon = `${LANDSCAPE_ICON_CLASS} ${CONSOLE_ICON_CLASS}`;
			panel.id = 'test-1';
			app.shell.addToMainArea(panel);
			//tracker.addWidget(panel);
			let res : string;
			connect().then(result => {
				res = result;
				console.log(res);
				chatManager.connect(res);

			});
			//    });

		}
	});
	palette.addItem({
		command,
		category
	});
	menu.addItem({
		command
	});

	command = 'chat:disconnect';
	commands.addCommand(command, {
		label : 'Disconnect from channel',
		execute : () => {
/* 			if (tracker.activeWidget) {
				tracker.activeWidget.dispose();
			} */
		}
	});
	palette.addItem({
		command,
		category
	});
	menu.addItem({
		command
	});

	mainMenu.addMenu(menu, {
		rank : 50
	});
}

function connect() : Promise < string > {
	let input = document.createElement('input');
	input.value = 'rdi';
	return showDialog({
		title : 'Connect to channel/user',
		body : input,
		okText : 'CONNECT'
	}).then(result => {
		if (result.text === 'CONNECT') {
			return input.value;
		}
	});
}
