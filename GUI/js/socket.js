// Tmp variables
// var speedAlert2 = [{'speed': -1, 'state': true, 'beeped': false},
//                   {'speed': -1, 'state': true, 'beeped': false},
//                   {'speed': -1, 'state': true, 'beeped': false},
//                   {'speed': -1, 'state': true, 'beeped': false},
//                   {'speed': -1, 'state': true, 'beeped': false},
//                   {'speed': -1, 'state': true, 'beeped': false}];

var HOST_BACKEND = "127.0.0.1";

var videoFirstCall = true;
var myVideo = []; 

try {
var socket = io.connect('http://' + HOST_BACKEND + ':8080');


} catch (e) { alert('Backend down. Please reload.' + e); }

socket.on('connect', function () {
  document.getElementById('icn_link_backend').style.color = "#27ae60"; 
});

socket.on('disconnect', function () {
    document.getElementById('icn_link_backend').style.color = "#c0392b";
    document.getElementById('icn_link_mobile').style.color = "#c0392b";
});

// Indique l'état de la connexion internet
 socket.on('wan', function(message) {
     if (message.state)
         document.getElementById('icn_link_mobile').style.color = "#27ae60"; 
     else
         document.getElementById('icn_link_mobile').style.color = "#c0392b";
    });
 
 
 // Indique si il y a un bouchon
 socket.on('isWarning', function(message) {
     if (message.state)
         document.getElementById('icnWarning').style.display = "inline"; 
     else
        document.getElementById('icnWarning').style.display = "none"; 
    });

 // Vitesse en temps réel
 socket.on('speed', function(message) {


    if (useGPS == false)
      message.value = speedDemo;


    var beeping = true;
    var sound = document.getElementById("SpeedSound");
    var nb = 0;
    for (var x= 0; x < speedAlert.length; x++)
    {
        speedAlert[x].speed = document.getElementById('speed' + x).text;
        if (document.getElementById('speed' + x).outerHTML.search("red") == -1)
        {
            speedAlert[x].state = true;
            if (speedAlert[x].speed <= Math.round(message.value) && speedAlert[x].beeped == false)
            {
              speedAlert[x].beeped = true;
              if (beeping == true)
                {
                  sound.play();
                  beeping = false;
                }
                if (x + 1 >= speedAlert.length)
                  {
                    document.getElementById("live_speed").style.color = "red";
                    document.getElementById("back-alert").style.opacity = "0.2";
                  }
            }
            else if (speedAlert[x].speed > Math.round(message.value))
                speedAlert[x].beeped = false;
        }
        else
          speedAlert[x].state = false; 
    }
    if (speedAlert[5].speed > Math.round(message.value))
    {
        document.getElementById("live_speed").style.color = "white";
        document.getElementById("back-alert").style.opacity = "0";
    }
    document.getElementById('live_speed').innerHTML = Math.round(message.value); 
    if (message.value == null)
      document.getElementById('live_speed').innerHTML = 0;
    for (var x= 0; x < speedAlert.length; x++)
    {
      if (speedAlert[x].beeping == true)
        return;
    } 
  });

 // Afficher liste de vidéo DashCam
socket.on('videos', function(message) {


    var videos = message.data.Files;
    var elemShown = 0;

    var inner = "";
    var videoName = "";
    var lock = [
      ["fa-lock", "green"],
      ["fa-unlock-alt", "red"]
    ];    

    var tmpVideoLock;

    for (var i = 0; i < videos.length; i++)
    {
      if (videoFirstCall == true)
        myVideo.push({ id: i, deleted: false, data: videos[i], locked: false});
      if (myVideo[i].locked == false)
        tmpVideoLock = lock[1];
      else 
        tmpVideoLock = lock[0];
      if ((videoFirstCall == true || myVideo[i].deleted == false) && elemShown < 6 && (i < actualPage * 6 && i >= (actualPage * 6) - 6))
      {
        videoName =  videos[i].Name.substring(9, 11) + "h" + videos[i].Name.substring(11, 13)+ " " + videos[i].Name.substring(6, 8) + "/" + videos[i].Name.substring(4, 6) + "/" + videos[i].Name.substring(0, 4);
        inner = inner + "<div class=\"videoLine\"><i class=\"fa fa-play-circle-o videoElem\" aria-hidden=\"true\" style=\"color: #2C3E50;\"></i>";
        inner = inner + "<div class=\"videoDate videoElem\" style=\"width:50%\"> " + videoName + " </div>"
        inner = inner + "<i class=\"fa "+ tmpVideoLock[0] + " locker videoElem\" aria-hidden=\"true\" style=\"color:"+ tmpVideoLock[1] +"\""
        inner = inner +  "onClick=\"unLockVid(\'" + i + "\')\"></i>"; 
        if (myVideo[i].locked == false)
        {
          inner = inner + "<i class=\"fa fa-times-circle deleteVid\" aria-hidden=\"true\" style=\"display: none;color: red;font-size: 27px;margin-top: 1.3%;\"";
          inner = inner + "onClick=\"deletVid(\'" + i + "\')\"></i>";
        }
        inner = inner +  "</div>";
        elemShown++;
      }
    }
    document.getElementById("videosPanel").innerHTML = inner;
    videoFirstCall = false;
 });

 // Vitesse d'alerte
 socket.on('speedAlert', function(message) {
    tmpSpeedAlert = message.data;
    document.getElementById('listSpeedAlert').innerHTML = "";
    for (var i = 0; i < message.data.length; i++)
    {
        if (message.data[i].state == true)
            document.getElementById('listSpeedAlert').innerHTML += "<div class=\"speedLimit\"> <a class=\"speedTitle\">Alerte " + (i + 1) + "</a> </br> <i class=\"fa fa-minus-circle changeSpeed\" aria-hidden=\"true\" onClick=\"changingSpeed('speed" + i + "', '-');\"></i> <a id=\"speed" + i + "\" style=\"color:green;\" onClick=\"setSpeedAlert(" + i + ", null, " + false + ")\" >" + message.data[i].speed + "</a> <i class=\"fa fa-plus-circle changeSpeed\" aria-hidden=\"true\" onClick=\"changingSpeed('speed" + i + "', '+');\"></i> </div>";
        else 
            document.getElementById('listSpeedAlert').innerHTML += "<div class=\"speedLimit\"> <a class=\"speedTitle\">Alerte " + (i + 1) + "</a> </br> <i class=\"fa fa-minus-circle changeSpeed\" aria-hidden=\"true\" onClick=\"changingSpeed('speed" + i + "', '-');\"></i> <a id=\"speed" + i + "\" style=\"color:red;\" onClick=\"setSpeedAlert(" + i + ", null, " + true + ")\" >" + message.data[i].speed + "</a> <i class=\"fa fa-plus-circle changeSpeed\" aria-hidden=\"true\" onClick=\"changingSpeed('speed" + i + "', '+');\"></i> </div>";
    }
});
 