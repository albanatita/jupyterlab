// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ContentsManager, IContents, IKernel, IServiceManager, ISession, utils
} from 'jupyter-js-services';

import {
  findIndex
} from 'phosphor/lib/algorithm/searching';

import {
  IDisposable, DisposableDelegate
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
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

import {
	NotebookModel
}
from '../notebook/notebook/model';


/**
 * An implementation of a document context.
 *
 * This class is typically instantiated by the document manger.
 */
export
class Context<T extends IDocumentModel> implements IDocumentContext<T> {
  /**
   * Construct a new document context.
   */
  constructor(options: Context.IOptions<T>) {
    let manager = this._manager = options.manager;
    this._factory = null;
    //this._opener = options.opener;
    this._path = options.path;
    //let lang = this._factory.preferredLanguage(this._path);
    //this._model = this._factory.createNew(lang);
	this.model=options.model;
    manager.sessions.runningChanged.connect(this._onSessionsChanged, this);
    //this._saver = new SaveHandler({ context: this, manager });
    //this._saver.start();
  }

  /**
   * A signal emitted when the kernel changes.
   */
  kernelChanged: ISignal<IDocumentContext<T>, IKernel>;

  /**
   * A signal emitted when the path changes.
   */
  pathChanged: ISignal<IDocumentContext<T>, string>;

  /**
   * A signal emitted when the model is saved or reverted.
   */
  contentsModelChanged: ISignal<IDocumentContext<T>, IContents.IModel>;

  /**
   * A signal emitted when the context is fully populated for the first time.
   */
  populated: ISignal<IDocumentContext<T>, void>;

  /**
   * A signal emitted when the context is disposed.
   */
  disposed: ISignal<IDocumentContext<T>, void>;

  /**
   * Get the model associated with the document.
   *
   * #### Notes
   * This is a read-only property
   */
  get model(): T {
    return this._model;
  }

  /**
   * The current kernel associated with the document.
   *
   * #### Notes
   * This is a read-only propery.
   */
  get kernel(): IKernel {
    return this._session ? this._session.kernel : null;
  }

  /**
   * The current path associated with the document.
   */
  get path(): string {
    return this._path;
  }

  /**
   * The current contents model associated with the document
   *
   * #### Notes
   * This is a read-only property.  The model will have an
   * empty `contents` field.
   */
  get contentsModel(): IContents.IModel {
    return this._contentsModel;
  }

  /**
   * Get the kernel spec information.
   *
   * #### Notes
   * This is a read-only property.
   */
  get kernelspecs(): IKernel.ISpecModels {
    return this._manager.kernelspecs;
  }

  /**
   * Test whether the context is fully populated.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isPopulated(): boolean {
    return this._isPopulated;
  }

  /**
   * Get the model factory name.
   *
   * #### Notes
   * This is a read-only property.
   */
  get factoryName(): string {
    return this.isDisposed ? '' : this._factory.name;
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
    this.disposed.emit(void 0);
    clearSignalData(this);
    this._model.dispose();
    this._manager = null;
    this._factory = null;
  }

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(options: IKernel.IModel): Promise<IKernel> {
    let session = this._session;
    if (options) {
      if (session) {
        return session.changeKernel(options);
      } else {
        let path = this._path;
        let sOptions: ISession.IOptions = {
          path,
          kernelName: options.name,
          kernelId: options.id
        };
        return this.startSession(sOptions);
      }
    } else {
      if (session) {
        return session.shutdown().then(() => {
          session.dispose();
          this._session = null;
          this.kernelChanged.emit(null);
          return void 0;
        });
      } else {
        return Promise.resolve(void 0);
      }
    }
  }

  /**
   * Set the path of the context.
   *
   * #### Notes
   * This is not intended to be called by the user.
   * It is assumed that the file has been renamed on the
   * contents manager prior to this operation.
   */
  setPath(value: string): void {
    this._path = value;
    let session = this._session;
    if (session) {
      session.rename(value);
    }
    this.pathChanged.emit(value);
  }

  /**
   * Save the document contents to disk.
   */
  save(): Promise<void> {
	return Promise.reject(new Error('This is a chat! You cannot save it!'));
  }

  /**
   * Save the document to a different path chosen by the user.
   */
  saveAs(): Promise<void> {
	return Promise.reject(new Error('This is a chat! You cannot save it!'));
  }

  /**
   * Revert the document contents to disk contents.
   */
  revert(): Promise<void> {
	return Promise.reject(new Error('This is a chat! You cannot save it!'));
  }

  /**
   * Create a checkpoint for the file.
   */
  createCheckpoint(): Promise<IContents.ICheckpointModel> {
		return null;
  }

  /**
   * Delete a checkpoint for the file.
   */
  deleteCheckpoint(checkpointID: string): Promise<void> {
	return Promise.reject(new Error('This is a chat! You cannot save it!'));
  }

  /**
   * Restore the file to a known checkpoint state.
   */
  restoreCheckpoint(checkpointID?: string): Promise<void> {
	return Promise.reject(new Error('This is a chat! You cannot save it!'));
  }

  /**
   * List available checkpoints for a file.
   */
  listCheckpoints(): Promise<IContents.ICheckpointModel[]> {
		return null;
  }

  /**
   * Get the list of running sessions.
   */
  listSessions(): Promise<ISession.IModel[]> {
    return this._manager.sessions.listRunning();
  }

  /**
   * Resolve a relative url to a correct server path.
   */
  resolveUrl(url: string): string {
    // Ignore urls that have a protocol.
    if (utils.urlParse(url).protocol || url.indexOf('//') === 0) {
      return url;
    }
    let cwd = ContentsManager.dirname(this._path);
    let path = ContentsManager.getAbsolutePath(url, cwd);
    return this._manager.contents.getDownloadUrl(path);
  }

  /**
   * Add a sibling widget to the document manager.
   */
  addSibling(widget: Widget): IDisposable {
	return null;
  }

  /**
   * Start a session and set up its signals.
   */
  startSession(options: ISession.IOptions): Promise<IKernel> {
    return this._manager.sessions.startNew(options).then(session => {
      if (this._session) {
        this._session.dispose();
      }
      this._session = session;
      this.kernelChanged.emit(session.kernel);
      session.pathChanged.connect((s, path) => {
        if (path !== this._path) {
          this.setPath(path);
        }
      });
      session.kernelChanged.connect((s, kernel) => {
        this.kernelChanged.emit(kernel);
      });
      return session.kernel;
    });
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

  /**
   * Handle a change to the running sessions.
   */
  private _onSessionsChanged(sender: ISession.IManager, models: ISession.IModel[]): void {
    let session = this._session;
    if (!session) {
      return;
    }
    let index = findIndex(models, model => model.id === session.id);
    if (index === -1) {
      session.dispose();
      this._session = null;
      this.kernelChanged.emit(null);
    }
  }

  /**
   * Handle an initial population.
   */
  private _populate(): void {
    this._isPopulated = true;
    // Add a checkpoint if none exists.
    this.listCheckpoints().then(checkpoints => {
      if (!checkpoints) {
        return this.createCheckpoint();
      }
    }).then(() => {
      this.populated.emit(void 0);
    });
  }

  private _manager: IServiceManager = null;
  //private _opener: (widget: Widget) => void = null;
  private _model: T = null;
  private _path = '';
  private _session: ISession = null;
  private _factory: IModelFactory<T> = null;
  //private _saver: SaveHandler = null;
  private _isPopulated = false;
  private _contentsModel: IContents.IModel = null;
}


// Define the signals for the `Context` class.
defineSignal(Context.prototype, 'kernelChanged');
defineSignal(Context.prototype, 'pathChanged');
defineSignal(Context.prototype, 'contentsModelChanged');
defineSignal(Context.prototype, 'populated');
defineSignal(Context.prototype, 'disposed');


/**
 * A namespace for `Context` statics.
 */
export namespace Context {
  /**
   * The options used to initialize a context.
   */
  export
  interface IOptions<T extends IDocumentModel> {
    /**
     * A service manager instance.
     */
    manager: IServiceManager;

    /**
     * The model factory used to create the model.
     */
    //factory: IModelFactory<T>;
	model: T;
    /**
     * The initial path of the file.
     */
    path: string;

    /**
     * An optional callback for opening sibling widgets.
     */
   // opener?: (widget: Widget) => void;
  }
}


