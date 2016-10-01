var http = require('http');
var fs = require('fs');
var ping = require ("net-ping");
var session = ping.createSession();

// Config
var ip_check_wan = "212.83.148.239"; // Call régulierement pour tester la connexion internet
var api = { host: 'cadance.eu', port: 4242};  // A CHANGER LES ADRESSES API ------------------------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// var api_gps = { host: 'board-cn.cadance.eu', port: 8181};
var api_gps = { host: 'localhost', port: 8181};
var api_dashcam = { host: 'localhost', port: 8066};

// Main variables
var client_socket = null;
var client_token = null;
var current_localisation = null; // Object receive from GPS API
current_localisation = {
    "sentence": "RMC",
    "type": "nav-info",
    "timestamp": "125559.000",
    "status": "valid",
    "lat": "48.86609600000001",
    "latPole": "N",
    "lon": "2.3732952999999952",
    "lonPole": "E",
    "speedKnots": 0.37,
    "trackTrue": 121.12,
    "date": "200316",
    "variation": 0,
    "variationPole": "",
    "talker_id": "GP",
    "speedKmh": "0"
};
var speedAlert = [{'speed': 50, 'state': true},
                  {'speed': 90, 'state': true},
                  {'speed': 120, 'state': true},
                  {'speed': 150, 'state': true},
                  {'speed': 180, 'state': true},
                  {'speed': 200, 'state': true}]; // Array(). Lancer une alerte (son) lorsque une des vitesses est dépassées. 

// Others variables
var lock_getWarning = false;
var lock_auth = false;
var timeout = 4000; // Time for get alert from distant CADANCE API
var timeoutGPS = 3000; // Time for get localisation from local GPS API

// Chargement du fichier index.html affiché au client
var server = http.createServer(function(req, res) {
    fs.readFile('./../GUI/index.html', 'utf-8', function(error, content) {
	res.writeHead(200, {"Content-Type": "text/html"});
	res.end(content);
    });
});

// Chargement de socket.io
var io = require('socket.io').listen(server);

// OnLoad
recordVideoAndStop();

// Call régulierement
setInterval(function getLocalisation() // Get localisation from GPS API
{
    var data = "";
        var options = {
          hostname: api_gps.host,
          port: api_gps.port,
          path: '/gps/info',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        
        var rq = http.request(options, (res) => 
            {
              res.setEncoding('utf8');
            
              res.on('data', (chunk) => {
                    data += chunk;
              });
            
              res.on('end', () => {
                    data = JSON.parse(data);
		  if (data.Message == null) // Si le GPS est en train de fix, il renvoie un Message. Si non, renvoie les coordonnées
                      current_localisation = data // Save current localisation si le GPS a fix

                    if (client_socket != null)
                    {                        
                        client_socket.emit('speed', { value: data.speedKmh });
                        console.log('Speed sent to GUI');
                    }
                    else
                        console.log('GET gps done but no client connected');
              })
            }).on('error', (e) => {
                    console.log('Problem with /gps/info: ' + e.message);
                    current_localisation = null;
            });

        rq.end();
}, 2000);


// Quand un client se connecte
io.sockets.on('connection', function (socket) {
    console.log('Un client est connecté !');
    client_socket = socket; // 1 seul navigateur en fullscreen. client_socket = null quand il n'y a pas de client
    checkInternet();  // Check si une connexion internet est présente
    
    // Quand un client se déconnecte
    socket.on('disconnect', function(){
        console.log('Un client est déconnecté');
        client_socket = null;
    });
    
    // Quand un client déclare une alert (daanger ou ralentissement)
    socket.on('sendAlert', function(data){
        getLocalisationAndSendAlert(data.type);
    });
    
    // Quand un client demande les vitesses où il bip
    socket.on('askSpeedAlert', function(data){
        sendSpeedAlert();
    });
    
    // Mettre à jour les bip pour les vitesses
    socket.on('setSpeedAlert', function(data){
        setSpeedAlert(data);
    });

    // Quant un client demande la liste des videos
    socket.on('getVideos', function(data){
        getVideo(data);
    });
});

// Check si une connexion internet est présente, alors on execute les fonctionnalités nécessitant internet
function checkInternet()
{
    if (client_socket == null)
        { console.log("Un client est parti. On arrete le check d'internet"); return ; }
    
    // On check internet
    session.pingHost (ip_check_wan, function (error, target) {
        try {
            if (error) // Si il n'y a pas internet, on s'arrete.
            {
                console.log ("Ping error: " + error.toString());
                client_socket.emit('wan', { state: false });
                setTimeout(checkInternet, timeout); // On relance
                return (false);
            }

            // Si on est ici, c'est qu'on a internet.
            console.log ("Ping ok");
            client_socket.emit('wan', { state: true });

            // On execute les fonctionnalitées nécessitant internet
            if (client_token == null)
                auth();
            else
                checkWarning();
            } catch (err) {}
        setTimeout(checkInternet, timeout); // On relance
    });
 // Semble avoir un pb sur la board
    
    return (true);
}

// Check si il y a des warning
function checkWarning()
{
        if (lock_getWarning) // Si un check est en cours, on ignore
            return (false);
        lock_getWarning = true; // On lock

        var data = "";
        var options = {
          hostname: api.host,
          port: api.port,
          path: '/api/notification',
          method: 'GET',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'x-api-token': client_token
          }
        };
        
        var rq = http.request(options, (res) => 
            {
                try {
                    if (res.statusCode == 204)
                    {
                        client_socket.emit('isWarning', { state: false });
                        console.log("No warning");
                        return ;
                    }
                    //console.log('STATUS: ' + res.statusCode);
                    res.setEncoding('utf8');
                } catch (err) {}
            
              res.on('data', (chunk) => {
                    data += chunk;
              });
            
              res.on('end', () => {
                  try {
                    data = JSON.parse(data);
                    client_socket.emit('isWarning', { state: true });
                  //console.log(data);
                    console.log('many warning');
                  } catch (err) {}
              })
            }).on('error', (e) => {
                    console.log('Problem with request getWarning: ' + e.message);
            });
    
        //rq.write();
        rq.end();
        
        lock_getWarning = false; // On dé-lock
}

// Get auth token from API
function auth()
{
        if (lock_auth) // Si un check est en cours, on ignore
            return (false);
        
        console.log('Auth to api...');
        
        lock_auth = true; // On lock

        var data = "";
        var options = {
          hostname: api.host,
          port: api.port,
          path: '/api/auth',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
             'Authorization': 'Basic Ym9hcmQ6Ym9hcmQ='
          }
        };
        
        var rq = http.request(options, (res) => 
            {
              //console.log('STATUS: ' + res.statusCode);
              res.setEncoding('utf8');
            
              res.on('data', (chunk) => {
                    data += chunk;
              });
            
              res.on('end', () => {
                    data = JSON.parse(data);
                    if (data.token != undefined)
                    {
                        client_token = data.token;
                        console.log('Auth done');
                    }
              })
            }).on('error', (e) => {
                    console.log('Problem with request auth: ' + e.message);
		console.log(e);
            }); 
 
    
        //rq.write();
        rq.end();

        
        lock_auth = false; // On dé-lock
}

// Get localisation and send alert to Cadance API
function getLocalisationAndSendAlert(type)
{
   if (current_localisation != null)
        sendAlert(type, current_localisation); // Send alert to Cadance API
    else
        console.log("Impossible d'envoyer une alerte car la localisation actuelle n'est pas récuperable");

}

// Get recording videos from API
function getVideo(message)
{
    var data = "";
        var options = {
          hostname: api_dashcam.host,
          port: api_dashcam.port,
          path: '/api/record/files',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-token': client_token
            }
        };
        var rq = http.request(options, (res) => 
            {
              res.setEncoding('utf8');
            
              res.on('data', (chunk) => {
                    data += chunk;
              });
            
              res.on('end', () => {
                    data = JSON.parse(data);
                    if (client_socket != null)
                    {
                      client_socket.emit('videos', { data: data, lock : message});
                    }
                    else {

                        console.log('GET Videos done but no client connected');
                      }
              })
            }).on('error', (e) => {
                    console.log('Problem with /api/record/files: ' + e.message);
            });
        rq.end();
}

// Send an alert (ralentissement ou accident) to API
// @type: (1) or (2)
// @gps_obj: obj json recu par l'api GPS local à la board
function sendAlert(type, gps_obj)
{
    var data = "";
        var options = {
          hostname: api.host,
          port: api.port,
          path: '/api/notification',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-token': client_token
          }
        };
        
        var rq = http.request(options, (res) => 
            {
              //console.log('STATUS SEND ALERT: ' + res.statusCode);
              res.setEncoding('utf8');
            
              res.on('data', (chunk) => {
                    data += chunk;
              });
            
              res.on('end', () => {
                    data = JSON.parse(data);
                    console.log(data.message);
              })
            }).on('error', (e) => {
                    console.log('Problem with request to cadance API: ' + e.message);
            });
    
        var body_send = JSON.stringify({
            "lon": gps_obj.lon,
            "lat": gps_obj.lat,
            "notification_type": type
        });
        rq.write(body_send);
        rq.end();
}

// Envoyer les limites de vitesse (bip sonore)
function sendSpeedAlert()
{
    client_socket.emit('speedAlert', { data: speedAlert });
}

// Mettre à jour les bip pour les vitesses
function setSpeedAlert(data)
{
    speedAlert = data;
    sendSpeedAlert();
}

// Enregistrer une mini video au boot de la board
function recordVideoAndStop()
{
    recordStart();
}

// Lance l'enregistremnt d'une video
function recordStart()
{
    var data = "";
    var options = {
        hostname: api_dashcam.host,
        port: api_dashcam.port,
        path: '/api/record/start',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-token': client_token
        }
    };

    var rq = http.request(options, (res) =>
			  {
			      res.setEncoding('utf8');

			      res.on('data', (chunk) => {
				  data += chunk;
			      });

			      res.on('end', () => {
				  data = JSON.parse(data);
				  console.log('record Start. Will be stop soon');
				  setTimeout(recordStop, 10000); // On stop
			      })
			  }).on('error', (e) => {
			      console.log('Problem with request to dashcam POST record/start: ' + e.message);
			  });
    rq.end();

}

// Stop l'enregistrement d'une video
function recordStop()
{
    var data = "";
    var options = {
        hostname: api_dashcam.host,
        port: api_dashcam.port,
        path: '/api/record/stop',
	method: 'POST',
	headers: {
            'Content-Type': 'application/json',
            'x-api-token': client_token
	}
    };

    var rq = http.request(options, (res) =>
                          {
                              res.setEncoding('utf8');

                              res.on('data', (chunk) => {
                                  data += chunk;
                              });

                              res.on('end', () => {
                                  data = JSON.parse(data);
				  console.log('Record STOP');
                              })
                          }).on('error', (e) => {
                              console.log('Problem with request to dashcam POST record/start: ' + e.message);
                          });
    rq.end();

}

server.listen(8080);
console.log("Server start");

