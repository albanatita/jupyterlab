from notebook.utils import url_path_join
from notebook.base.handlers import IPythonHandler
import json
from tornado import websocket

# Different message types
MESSAGE     = 0
NAMECHANGE  = 1
JOIN        = 2
LEAVE       = 3
USERLIST    = 4
ERROR = 5

CONNECTED_CLIENTS = []
class messageWebSocket(websocket.WebSocketHandler):
    """ The chat implemententation, all data send to server is json, all responses are json """

    def open(self):
        CONNECTED_CLIENTS.append(self)
        self.client_name = ''
        self.join_completed = False # Not completed until a name has been selected

    def on_message(self, message):
        try:
            pkg = json.loads(message)
        except:
            return self.write_message(self.create_error_pkg(u'Format error'))
        if pkg['TYPE'] == JOIN:
            self.join_completed = True
            self.client_name = pkg['USER']
            self.join_completed = True
            self.broadcast(self.create_join_pkg())
            self.write_message(self.create_userlist_pkg())
        elif pkg['TYPE'] == MESSAGE:
            self.broadcast(self.create_message_pkg(pkg['MESSAGE']))
        elif pkg['TYPE'] == USERLIST:
            self.write_message(self.create_userlist_pkg())
        elif pkg['TYPE'] == NAMECHANGE:
            old_name = self.client_name
            self.client_name = pkg['NEWNAME']
            self.broadcast(self.create_name_change_pkg(old_name))
        else:
            self.write_message(self.create_error_pkg('unknown message type'))

    def broadcast(self, pkg, all_but=None):
        for c in CONNECTED_CLIENTS:
            if c.join_completed and c != all_but:
                c.write_message(pkg)

    def create_join_pkg(self):
        pkgdata = {'TYPE': JOIN, 'USER': self.client_name}
        return json.dumps(pkgdata)

    def create_name_change_pkg(self, old_name):
        pkgdata = {'TYPE': NAMECHANGE, 'OLDNAME': old_name, 'NEWNAME': self.client_name}
        return json.dumps(pkgdata)
    
    def create_message_pkg(self, msg):
        pkgdata = {'TYPE': MESSAGE, 'SENDER': self.client_name, 'MESSAGE': msg}
        return json.dumps(pkgdata)

    def create_leave_pkg(self):
        pkgdata = {'TYPE': LEAVE, 'USER': self.client_name}
        return json.dumps(pkgdata)

    def create_userlist_pkg(self):
        pkgdata = {'TYPE': USERLIST, 'USERS': [c.client_name for c in CONNECTED_CLIENTS]}
        return json.dumps(pkgdata)

    def create_error_pkg(self, detail):
        pkgdata = {'TYPE': ERROR, 'DETAIL': detail}
        return json.dumps(pkgdata)

    def on_close(self):
        self.broadcast(self.create_leave_pkg(), all_but=self)
        CONNECTED_CLIENTS.remove(self)

def _jupyter_server_extension_paths():
    return [{
        "module": "chatExtension"
    }]


def load_jupyter_server_extension(nbapp):
    web_app = nbapp.web_app
    host_pattern = '.*$'
    route_pattern = url_path_join(web_app.settings['base_url'], '/chat')
    web_app.add_handlers(host_pattern, [(route_pattern, messageWebSocket)])
    nbapp.log.info("chat module enabled!")