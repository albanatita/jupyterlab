// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ContentsManager, IContents, IKernel, IServiceManager, ISession, utils
} from 'jupyter-js-services';


import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  showDialog, okButton
} from '../dialog';

import {
  IDocumentContext, IDocumentModel, IModelFactory
} from '../docregistry';


/**
 * An implementation of a document context.
 */
class Context implements IDocumentContext<IDocumentModel> {
  /**
   * Construct a new document context.
   */
  constructor(manager: FloatContextManager) {
    this._manager = manager;
    this._id = utils.uuid();
  }

  /**
   * A signal emitted when the kernel changes.
   */
  kernelChanged: ISignal<Context, IKernel>;

  /**
   * A signal emitted when the path changes.
   */
  pathChanged: ISignal<Context, string>;

  /**
   * A signal emitted when the model is saved or reverted.
   */
  contentsModelChanged: ISignal<Context, IContents.IModel>;

  /**
   * A signal emitted when the context is fully populated for the first time.
   */
  populated: ISignal<IDocumentContext<IDocumentModel>, void>;

  /**
   * The unique id of the context.
   *
   * #### Notes
   * This is a read-only property.
   */
  get id(): string {
    return this._id;
  }

  /**
   * Get the model associated with the document.
   *
   * #### Notes
   * This is a read-only property
   */
  get model(): IDocumentModel {
    return this._manager.getModel(this._id);
  }

  /**
   * The current kernel associated with the document.
   *
   * #### Notes
   * This is a read-only propery.
   */
  get kernel(): IKernel {
    return this._manager.getKernel(this._id);
  }

  /**
   * The current path associated with the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get path(): string {
    return this._manager.getPath(this._id);
  }

  /**
   * The current contents model associated with the document
   *
   * #### Notes
   * This is a read-only property.  The model will have an
   * empty `contents` field.
   */
  get contentsModel(): IContents.IModel {
    return this._manager.getContentsModel(this._id);
  }

  /**
   * Get the kernel spec information.
   *
   * #### Notes
   * This is a read-only property.
   */
  get kernelspecs(): IKernel.ISpecModels {
    return this._manager.getKernelspecs();
  }

  /**
   * Test whether the context is fully populated.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isPopulated(): boolean {
    return this._manager.isPopulated(this._id);
  }

  /**
   * Test whether the context has been disposed (read-only).
   */
  get isDisposed(): boolean {
    return this._manager === null;
  }

  /**
   * Dispose of the resources held by the context.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._manager = null;
    this._id = '';
  }

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(options: IKernel.IModel): Promise<IKernel> {
    return this._manager.changeKernel(this._id, options);
  }

  /**
   * Save the document contents to disk.
   */
  save(): Promise<void> {
    return this._manager.save(this._id);
  }

  /**
   * Save the document to a different path chosen by the user.
   */
  saveAs(): Promise<void> {
    return this._manager.saveAs(this._id);
  }

  /**
   * Revert the document contents to disk contents.
   */
  revert(): Promise<void> {
    return this._manager.revert(this._id);
  }

  /**
   * Create a checkpoint for the file.
   */
  createCheckpoint(): Promise<IContents.ICheckpointModel> {
    return this._manager.createCheckpoint(this._id);
  }

  /**
   * Delete a checkpoint for the file.
   */
  deleteCheckpoint(checkpointID: string): Promise<void> {
    return this._manager.deleteCheckpoint(this.id, checkpointID);
  }

  /**
   * Restore the file to a known checkpoint state.
   */
  restoreCheckpoint(checkpointID?: string): Promise<void> {
    return this._manager.restoreCheckpoint(this.id, checkpointID);
  }

  /**
   * List available checkpoints for the file.
   */
  listCheckpoints(): Promise<IContents.ICheckpointModel[]> {
    return this._manager.listCheckpoints(this.id);
  }

  /**
   * Get the list of running sessions.
   */
  listSessions(): Promise<ISession.IModel[]> {
    return this._manager.listSessions();
  }

  /**
   * Resolve a url to a correct server path.
   */
  resolveUrl(url: string): string {
    return this._manager.resolveUrl(this._id, url);
  }

  /**
   * Add a sibling widget to the document manager.
   *
   * @param widget - The widget to add to the document manager.
   *
   * @returns A disposable used to remove the sibling if desired.
   *
   * #### Notes
   * It is assumed that the widget has the same model and context
   * as the original widget.
   */
  addSibling(widget: Widget): IDisposable {
    return this._manager.addSibling(this._id, widget);
  }

  private _id = '';
  private _manager: FloatContextManager = null;
}


// Define the signals for the `Context` class.
defineSignal(Context.prototype, 'kernelChanged');
defineSignal(Context.prototype, 'pathChanged');
defineSignal(Context.prototype, 'contentsModelChanged');
defineSignal(Context.prototype, 'populated');



export
class FloatContextManager implements IDisposable {
  /**
   * Construct a new context manager.
   */
  constructor(options: FloatContextManager.IOptions) {
    this._manager = options.manager;
  }

  /**
   * Get whether the context manager has been disposed.
   */
  get isDisposed(): boolean {
    return this._manager === null;
  }

  /**
   * Dispose of the resources held by the document manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._manager = null;
    for (let id in this._contexts) {
      let contextEx = this._contexts[id];
      contextEx.context.dispose();
      contextEx.model.dispose();
      let session = contextEx.session;
      if (session) {
        session.dispose();
      }
    }
    this._contexts = null;
  }

  /**
   * Create a new context.
   */
  createNew(path: string, model: IDocumentModel): string {
    let context = new Context(this);
    let id = context.id;
    this._contexts[id] = {
      context,
      path,
      model,
      contentsModel: null,
      session: null,
      isPopulated: false
    };
    return id;
  }

  /**
   * Get a context for a given path and model name.
   */

  /**
   * Get a context by id.
   */
  getContext(id: string): IDocumentContext<IDocumentModel> {
    return this._contexts[id].context;
  }

  /**
   * Get the model associated with a context.
   */
  getModel(id: string): IDocumentModel {
    return this._contexts[id].model;
  }

  /**
   * Remove a context.
   */
  removeContext(id: string): void {
    let contextEx = this._contexts[id];
    contextEx.model.dispose();
    contextEx.context.dispose();
    delete this._contexts[id];
  }

  /**
   * Get the current kernel associated with a document.
   */
  getKernel(id: string): IKernel {
    let session = this._contexts[id].session;
    return session ? session.kernel : null;
  }
    
      /**
   * Find a context by path.
   */
  getIdsForPath(path: string): string[] {
    let ids: string[] = [];
    for (let id in this._contexts) {
      if (this._contexts[id].path === path) {
        ids.push(id);
      }
    }
    return ids;
  }

  /**
   * Get the current path associated with a document.
   */
  getPath(id: string): string {
    return this._contexts[id].path;
  }

  /**
   * Get the current contents model associated with a document.
   */
  getContentsModel(id: string): IContents.IModel {
    return this._contexts[id].contentsModel;
  }

  /**
   * Change the current kernel associated with the document.
   *
   * @param options - If given, change the kernel (starting a session
   * if necessary). If falsey, shut down any existing session and return
   */
  changeKernel(id: string, options: IKernel.IModel): Promise<IKernel> {
    let contextEx = this._contexts[id];
    let session = contextEx.session;
    if (options) {
      if (session) {
        return session.changeKernel(options);
      } else {
        let path = contextEx.path;
        let sOptions: ISession.IOptions = {
          path: path,
          kernelName: options.name,
          kernelId: options.id
        };
        return this.startSession(id, sOptions);
      }
    } else {
      if (session) {
        return session.shutdown().then(() => {
          session.dispose();
          contextEx.session = null;
          contextEx.context.kernelChanged.emit(null);
          return void 0;
        });
      } else {
        return Promise.resolve(void 0);
      }
    }
  }

  /**
   * Update the path of an open document.
   *
   * @param id - The id of the context.
   *
   * @param newPath - The new path.
   */
  handleRename(oldPath: string, newPath: string): void {
    // Update all of the paths, but only update one session
    // so there is only one REST API call.
    let ids = this.getIdsForPath(oldPath);
    let sessionUpdated = false;
    for (let id of ids) {
      let contextEx = this._contexts[id];
      contextEx.path = newPath;
      contextEx.context.pathChanged.emit(newPath);
      if (!sessionUpdated) {
        let session = contextEx.session;
        if (session) {
          session.rename(newPath);
          sessionUpdated = true;
        }
      }
    }
  }

  /**
   * Get the current kernelspec information.
   */
  getKernelspecs(): IKernel.ISpecModels {
    return this._manager.kernelspecs;
  }

  /**
   * Save the document contents to disk.
   */
  save(id: string): Promise<void> {
      return Promise.reject(new Error('This is a chat! You cannot save it!'));

  }

  /**
   * Save a document to a new file path chosen by the user.
   *
   * This results in a new session.
   */
  saveAs(id: string): Promise<void> {
      return Promise.reject(new Error('This is a chat! You cannot save it!'));
  }

  /**
   * Revert the contents of a path.
   */
  revert(id: string): Promise<void> {
      return Promise.reject(new Error('This is a chat! You cannot do that!'));
  }

  /**
   * Test whether the context is fully populated.
   */
  isPopulated(id: string): boolean {
    let contextEx = this._contexts[id];
    return contextEx.isPopulated;
  }

  /**
   * Finalize a context.
   */
  finalize(id: string): void {
    let contextEx = this._contexts[id];
    if (contextEx.isPopulated) {
      return;
    }
    contextEx.isPopulated = true;
    this._contexts[id].context.populated.emit(void 0);
  }

  /**
   * Create a checkpoint for a file.
   */
  createCheckpoint(id: string): Promise<IContents.ICheckpointModel> {
      return null;
  }

  /**
   * Delete a checkpoint for a file.
   */
  deleteCheckpoint(id: string, checkpointID: string): Promise<void> {
      return Promise.reject(new Error('This is a chat! You cannot do that!'));
  }

  /**
   * Restore a file to a known checkpoint state.
   */
  restoreCheckpoint(id: string, checkpointID?: string): Promise<void> {
      return Promise.reject(new Error('This is a chat! You cannot do that!'));
  }

  /**
   * List available checkpoints for a file.
   */
  listCheckpoints(id: string): Promise<IContents.ICheckpointModel[]> {
      return null;
  }

  /**
   * Get the list of running sessions.
   */
  listSessions(): Promise<ISession.IModel[]> {
    return this._manager.sessions.listRunning();
  }


  /**
   * Start a session and set up its signals.
   */
  startSession(id: string, options: ISession.IOptions): Promise<IKernel> {
    let contextEx = this._contexts[id];
    let context = contextEx.context;
    return this._manager.sessions.startNew(options).then(session => {
      if (contextEx.session) {
        contextEx.session.dispose();
      }
      contextEx.session = session;
      context.kernelChanged.emit(session.kernel);
      session.pathChanged.connect((s, path) => {
        if (path !== contextEx.path) {
          contextEx.path = path;
          context.pathChanged.emit(path);
        }
      });
      session.kernelChanged.connect((s, kernel) => {
        context.kernelChanged.emit(kernel);
      });
      return session.kernel;
    });
  }
    
      /**
   * Resolve a relative url to a correct server path.
   */
  resolveUrl(id: string, url: string): string {
    // Ignore urls that have a protocol.
    if (utils.urlParse(url).protocol || url.indexOf('//') === 0) {
      return url;
    }
    let contextEx = this._contexts[id];
    let cwd = ContentsManager.dirname(contextEx.path);
    let path = ContentsManager.getAbsolutePath(url, cwd);
    return this._manager.contents.getDownloadUrl(path);
  }
      /**
   * Add a sibling widget to the document manager.
   */
    
  addSibling(id: string, widget: Widget): IDisposable {
    
    return null;
  }
  /**
   * Copy the contents of a contents model, without the content.
   */
  private _copyContentsModel(model: IContents.IModel): IContents.IModel {
    return {
      path: model.path,
      name: model.name,
      type: model.type,
      writable: model.writable,
      created: model.created,
      last_modified: model.last_modified,
      mimetype: model.mimetype,
      format: model.format
    };
  }

  private _manager: IServiceManager = null;
  private _contexts: { [key: string]: Private.IContextEx } = Object.create(null);
}


/**
 * A namespace for ContextManager statics.
 */
export namespace FloatContextManager {
  /**
   * The options used to initialize a context manager.
   */
  export
  interface IOptions {
    /**
     * A service manager instance.
     */
    manager: IServiceManager;

    /**
     * A callback for opening sibling widgets.
     */

  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An extended interface for data associated with a context.
   */
  export
  interface IContextEx {
    context: IDocumentContext<IDocumentModel>;
    model: IDocumentModel;
    session: ISession;
    path: string;
    contentsModel: IContents.IModel;
    isPopulated: boolean;

  }

  /**
   * Get a new file path from the user.
   */
  export
  function saveAs(path: string): Promise<string> {
      return null;
  }
}
