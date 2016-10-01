$().ready(main);

var   actualPage = 1;
var speedAlert = [{'speed': 50, 'state': true, 'beeped': false},
                  {'speed': 90, 'state': true, 'beeped': false},
                  {'speed': 120, 'state': true, 'beeped': false},
                  {'speed': 150, 'state': true, 'beeped': false},
                  {'speed': 180, 'state': true, 'beeped': false},
                  {'speed': 200, 'state': true, 'beeped': false}];

var speedDemo = 201;
var useGPS = true;

var videoLocked = [];

function main()
{
  // Design all pop-up
  // Close btn
  var close_btn = document.createElement('i');
  $(close_btn).addClass('fa fa-close fa-2x close_btn');
  $(close_btn).click(function() { $(close_btn.parentElement).hide(); });
  $('.pop-up').append(close_btn);
  $('.pop-up').hide();
  getSpeedAlert();
}

function DEMOuseGPS()
{
  if (useGPS == true)
  {
    useGPS = false;
    document.getElementById("demo-speed").style.color = "green";
  }
  else if (useGPS == false)
  {
    useGPS = true;
    document.getElementById("demo-speed").style.color = "red";
  }
}

function DEMOchangingSpeed(act)
{
  var speed = parseInt(document.getElementById("demo-speed").innerHTML);
  if (act == '+')
    speed+=5;
  else if (speed - 5 > 0)
    speed-=5;
  document.getElementById("demo-speed").innerHTML = speed;
  speedDemo = speed;
}


function sendAlert(type)
{
    console.log('ok');
    socket.emit('sendAlert', { type: type });
}


function showPopup(id, signe)
{
    var myPopup = document.getElementById(id);

//    $('#' + id).addClass('fa fa-cloud fa-2x icn_btn');
    if (myPopup.style.display == 'none')
    {
        $('.pop-up').hide();
        var icn_btn = document.createElement('i');
        $(icn_btn).addClass('fa ' + signe + ' fa-2x icn_btn');
        $('.pop-up').append(icn_btn);
        myPopup.style.display = 'block';
    }
        else
    {
            myPopup.style.display = 'none';
    }
    if (id == "cam-up")
        showVideoFiles();
}

function showVideoFiles()
{
     socket.emit('getVideos', videoLocked); 
}

function unLockVid(id){

  var tmpVideo = document.getElementsByClassName("locker");
  var tmplock;
  for (var i = 0; i < tmpVideo.length; i++)
  {
    tmpLock = true;
    if (tmpVideo[i].outerHTML.search("red")  == -1)
      tmpLock = false;
    videoLocked.push({ elem: tmpVideo[i], state : tmplock});
  }
  if (myVideo[id].locked == true)
    {
       tmpVideo[id].className = "fa fa-lock locker videoElem";
       myVideo[id].locked = false;
    }
  else
    {
      tmpVideo[id].className = "fa fa-unlock-alt locker videoElem";
      myVideo[id].locked = true;
    }
  showVideoFiles();
}

function deletVid(id){
    myVideo[id].deleted = true;
    showVideoFiles();
}

function allowDel(){
  var del = document.getElementsByClassName("deleteVid");
  var i = 0;
  for (i = 0; i < del.length; i++) {
    if (del[i].style.display == "none")
      del[i].style.display = "inline-block";
    else
      del[i].style.display = "none"; 
  }
}

function camArrow(nb) {
  if ((nb == -1  && actualPage > 1) || (nb == 1 && actualPage < myVideo.length / 6))
  {
   actualPage = actualPage + nb;
   showVideoFiles();
  }
}

function changingSpeed(id, act)
{
  var speed = parseInt(document.getElementById(id).innerHTML);
  if (act == '+')
    speed+=5;
  else if (speed - 5 > 0)
    speed-=5;
  else 
    return;
  setSpeedAlert(id.substring(5,6), speed, null);
  document.getElementById(id).innerHTML = speed;
}

function getSpeedAlert()
{
    try {
  var speeds = socket.emit('askSpeedAlert', true);
    } catch (err) { }
}

function setSpeedAlert(i, speed, state)
{
  var x = 0;
  for (var x= 0; x < speedAlert.length; x++)
  {
      speedAlert[x].speed = document.getElementById('speed' + x).text;
      if (document.getElementById('speed' + x).outerHTML.search("red") == -1)
        speedAlert[x].state = true;
      else
        speedAlert[x].state = false; 
  }
  if (speed != null) 
      speedAlert[i].speed = speed;
  if (state != null)
    speedAlert[i].state = state;
  speedAlert[i].beeped = false;

    socket.emit('setSpeedAlert', speedAlert);
}
