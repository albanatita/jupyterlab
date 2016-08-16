import {
  INotebookModel,NotebookModel
} from '../notebook/notebook/model';

import {
  IChangedArgs
} from '../common/interfaces';

import {
  IObservableList, IListChangedArgs
} from '../common/observablelist';

import {
  PanelLayout
} from 'phosphor/lib/ui/panel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  IMetadataCursor, MetadataCursor
} from '../notebook/common/metadata';

import {
  nbformat
} from '../notebook/notebook/nbformat';

import {
  ICellModel, ICodeCellModel, IRawCellModel, IMarkdownCellModel,
  CodeCellModel, RawCellModel, MarkdownCellModel
} from '../notebook/cells/model';

import {
    BaseCellWidget
} from '../notebook/cells/widget';

import {
    NotebookPanel
}from '../notebook/notebook/panel';


import './index.css';

const CELLREMOTE_CLASS='jp-CellRemote';

export
class ChatManager {

private _model: NotebookModel = null;
private _socket: WebSocket=null;
private _user:string=null;
private _nb:NotebookPanel=null;
    
constructor(nb:NotebookPanel) {
    this._nb=nb;
    }
 
set model(newValue:NotebookModel){
    this._model=newValue;
    this._model.cells.changed.connect(this._onModelChanged,this);
for (let i=0;i<this._model.cells.length;i++){
    this._model.cells.get(i).contentChanged.connect(this._onCellContentChanged,this);
}
    console.log('new model');
    return;
}

private _onCellContentChanged(cell:ICellModel,args: void):void{
    //console.log(cell);
    let cursor: IMetadataCursor=cell.getMetadata('owner');
if (cursor.getValue()===this._user) {
    var idx=this._model.cells.indexOf(cell);
    this._socket.send(JSON.stringify({TYPE:0,USER:this._user,OPERATION:2,INDEX:idx,VALUE:cell.toJSON()})) ;
}
}    
    
private _onModelChanged(sender: IObservableList<ICellModel>, args: IListChangedArgs<ICellModel>): void {
    console.log(args);
    let cell: ICellModel;
    switch (args.type ){
            case 'add':
            var cellres=args.newValue as ICellModel;
            let cursor: IMetadataCursor=cellres.getMetadata('owner');
if (cursor.getValue()==null) {
    cursor.setValue(this._user);
            this._socket.send(JSON.stringify({TYPE:0,USER:this._user,OPERATION:0,INDEX:args.newIndex,VALUE:JSON.stringify(cellres.toJSON())})) ;
            cell = args.newValue as ICellModel;
            cell.contentChanged.connect(this._onCellContentChanged,this);
                }
            break;
    }
    }
    
connect(name:string):void{
            this._user=name;
            this._socket = new WebSocket('ws://localhost:8888/chat'); 
    console.log('connecting...');

                var socket=this._socket;
                var model=this._model;
                var nb=this._nb;
                this._socket.onopen=function(){
                    socket.send(JSON.stringify({ TYPE: 2, USER: name}));

                }
                this._socket.onmessage=function(event){
                    console.log(name);
                    console.log('message received');
                    var msg=JSON.parse(event.data);
                    console.log(msg)
                    switch(msg.TYPE) {
                        
                        case 0:
                            if (msg.SENDER===name){break;}
                            switch(msg.TYPEOP) {
                                    case 0:
                                        if (msg.OPERATION===0) {
                                            console.log('empty model');                                            
                                        }
                                        break;
                                    case 1:
                                        if (msg.OPERATION===0) {
                                            console.log('adding a cell from other user');
                                            var idx=msg.INDEX;
                                            console.log(msg.VALUE);
                                            let cell=JSON.parse(msg.VALUE);
                                            switch (cell.cell_type){
                                                    case 'code':
                                                        var cella=new CodeCellModel(cell);
                                                        model.cells.insert(idx,cella);
                                                        break;
                                                      case 'markdown':
                                                        model.cells.insert(idx,new MarkdownCellModel(cell));
                                                        break;
                                                      case 'raw':
                                                        model.cells.insert(idx,new RawCellModel(cell));
                                                        break;
                                            }
                                            let cellwidget: BaseCellWidget=nb.content.childAt(idx);
                                            cellwidget.readOnly=true;
                                            cellwidget.addClass(CELLREMOTE_CLASS);
                                            let owner=new Widget();
                                            owner.node.textContent=msg.SENDER;
                                            owner.addClass(CELLREMOTE_CLASS);
                                            let layout: PanelLayout=cellwidget.layout as PanelLayout;
                                            layout.insertWidget(0,owner);
                                        }
                                        
                                        if (msg.OPERATION===2) {
                                            var idx=msg.INDEX;
                                            //let source:string =msg.VALUE;
                                            let celli:ICellModel=model.cells.get(idx);
                                            //celli.source=source;
                                            //nb.content.childAt(idx).update();
                                            console.log(msg.VALUE);
                                            var cellm=msg.VALUE;
                                            celli.source=cellm.source;
                                            if (cellm.cell_type==='code') {
                                                if(!(cellm.outputs==null)){
                                                    (celli as CodeCellModel).outputs.clear();
                                                     for (let output of (cellm as nbformat.ICodeCell).outputs) {
                                                        (celli as CodeCellModel).outputs.add(output);
                                                     }                                             
                                                }
                                                if(!(cellm.execution_count==null)){
                                                (celli as CodeCellModel).executionCount=cellm.execution_count;}
                                            }
                                            nb.content.childAt(idx).update();
                                        }
                                        break;
                            }
                            break;
                    }
                }
    return;
}
}

