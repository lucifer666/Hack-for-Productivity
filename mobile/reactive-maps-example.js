Markers = new Mongo.Collection('notifications4');
var EVENT_TYPE_COP_DETECTED = 0,
    EVENT_TYPE_HOLE_DETECTED = 1,
    EVENT_TYPE_DRIVER_CURRENT_POSITION = 2,
    EVENT_TYPE_TRAFFIC_JAM = 3,
    IMAGES_FOLDER_PATH = "images/",
    currentLocationPosition,
    currentPositionMarker,
    latestMapLatitude,
    latestMapLongitude,
    googleMapInstance,
    markers = [],
    radius = 1; //in kilomethers

function sendNotification(latitude, longitude, notificationType) {
    var markerId = new Date().getTime();
    console.log('sendNotification', latitude, longitude);
    Markers.insert({ lat: latitude, lng: longitude, type: notificationType, markerId: markerId});
}

function createMarker(latitude, longitude, type, markerId) {
    var isMarkerIdSpecified = typeof markerId !== "undefined";
    var markerIcon = getMarkerIconByType(type);
    markerId = markerId || new Date().getTime();
    var marker = new google.maps.Marker({
        draggable: false,
        icon: markerIcon,
        animation: google.maps.Animation.DROP,
        position: new google.maps.LatLng(latitude, longitude),
        map: googleMapInstance,
        markerId: markerId
    });
   if (isMarkerIdSpecified) {
        markers.push(marker);
    }
    console.log('createMarker', latitude, longitude, type);

    return marker;
}

function isMarkerLocal(currentMarkerLat, currentMarkerLng){
    return getDistance(currentMarkerLat, currentMarkerLng) <= radius
}

function getDistance(markerLat, markerLng){  // generally used geo measurement function
    var R = 6378.137; // Radius of earth in KM
    var dLat = (markerLat - currentLocationPosition.latitude) * Math.PI / 180;
    var dLon = (markerLng - currentLocationPosition.longitude) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(currentLocationPosition.latitude * Math.PI / 180) * Math.cos(markerLat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;

    console.log('distance: ', d);
    return d; // kilomethers
}

function getGoogleMapMarkerById(markerId) {
   console.log("dqdo" , markers);
   var markerWithId;
   markers.forEach(function (currentMarker) {

     console.log("baba" , currentMarker.markerId);
     if (currentMarker.markerId === markerId) {
        console.log("matched");
        markerWithId = currentMarker;
     }
   });
   return markerWithId;
}

function updateLocalMarkers(){
    console.log('updateLocalMarkers');
    Markers.find().forEach(function(currentMarker){
        var currentMarkerLat = currentMarker.lat;
        var currentMarkerLng = currentMarker.lng;
        var markerId = currentMarker.markerId;
        console.log('check if marker is local', currentMarker);
        var currentGoogleMapsMarker = getGoogleMapMarkerById(markerId);
        if(typeof currentGoogleMapsMarker !== "undefined"){
           if(!isMarkerLocal(currentMarkerLat, currentMarkerLng)){
               console.log("pone edno", currentGoogleMapsMarker);
               currentGoogleMapsMarker.setMap(null);
               currentGoogleMapsMarker.setVisible(false);
           }else{            
               currentGoogleMapsMarker.setMap(googleMapInstance);
               currentGoogleMapsMarker.setVisible(true);
           }
        }
    });
}

function getMarkerIconByType(notificationType) {
    switch (notificationType) {
        case EVENT_TYPE_COP_DETECTED:
             return "https://scontent.xx.fbcdn.net/hphotos-xat1/v/t34.0-12/12064122_1682719258626852_2060662579_n.jpg?oh=290c3df2f4e5456028dcc4bdade4b023&oe=5612C23A";
        case EVENT_TYPE_HOLE_DETECTED:
            return "https://scontent.xx.fbcdn.net/hphotos-xla1/v/t34.0-12/12071491_884081898351938_1029038919_n.jpg?oh=52c4a31f34dc16877b5c0d06a0841a21&oe=5611BED9";
        case EVENT_TYPE_TRAFFIC_JAM:
            return "https://scontent.xx.fbcdn.net/hphotos-xpa1/v/t34.0-12/12077492_1682719235293521_201055047_n.jpg?oh=1b9081a7c7c2e14796e70f3ed90db549&oe=5612E0BE"
        default:
            return "https://scontent.xx.fbcdn.net/hphotos-xpt1/v/t34.0-12/12081547_884081931685268_1370675732_n.jpg?oh=b268cb3de7aac30a4093552931319f4c&oe=5611C9CC"
    }
}
if (Meteor.isClient) {
  Template.map.onCreated(function() {
    GoogleMaps.ready('map', function(map) {
      Markers.find().forEach(function(currentMarker){
          var marker = createMarker(currentMarker.lat, currentMarker.lng, currentMarker.type, currentMarker.markerId);
      });

      // zoomControl: false
      googleMapInstance = map.instance;
      //google.maps.event.addListener(map.instance, 'click', function(event) {
        //latestMapLatitude = event.latLng.lat();
        //latestMapLongitude = event.latLng.lng();
        //var currentPositionMarkerId = new Date().getTime();
        //Markers.insert({ lat: latestMapLatitude, lng: latestMapLongitude, currentPositionMarkerId});
      //});
        function showPosition(data) {
            currentLocationPosition = data.coords;
            latestMapLongitude = data.coords.longitude;
            latestMapLatitude = data.coords.latitude;
            console.log("current position: ", data, Template.map);
            map.instance.setCenter(new google.maps.LatLng(currentLocationPosition.latitude, currentLocationPosition.longitude));
            updateCurrentPositionMarker();
        }
        function updateCurrentPositionMarker() {
            if (!currentPositionMarker) {
                var currentPositionMarkerId = new Date().getTime();
                currentPositionMarker = createMarker(currentLocationPosition.latitude, currentLocationPosition.longitude, EVENT_TYPE_DRIVER_CURRENT_POSITION);
            } else {
                currentPositionMarker.setPosition({ lat: currentLocationPosition.latitude, lng: currentLocationPosition.longitude });
            }
            updateLocalMarkers();
        }
        function checkCurrentPosition() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(showPosition);
            }
        }
        checkCurrentPosition();
        setInterval(checkCurrentPosition, 8000);

      var markers = {};

      Markers.find().observe({
        added: function (document) {
          console.log("Notification data:", document);
          var marker = createMarker(document.lat, document.lng, document.type);

          google.maps.event.addListener(marker, 'dragend', function(event) {
            Markers.update(marker.id, { $set: { lat: event.latLng.lat(), lng: event.latLng.lng() }});
          });

          markers[document._id] = marker;
        },
        changed: function (newDocument, oldDocument) {
          markers[newDocument._id].setPosition({ lat: newDocument.lat, lng: newDocument.lng });
        },
        removed: function (oldDocument) {
          markers[oldDocument._id].setMap(null);
          google.maps.event.clearInstanceListeners(markers[oldDocument._id]);
          delete markers[oldDocument._id];
        }
      });
    });
  });

  Meteor.startup(function() {
    GoogleMaps.load();
  });
//
  if (Meteor.isServer) {

  Meteor.startup(function() {

    return Meteor.methods({

      removeAllPosts: function() {

        return Posts.remove({});

      }

    });

  });

}
//

  Template.map.helpers({
    mapOptions: function() {
      if (GoogleMaps.loaded()) {
        return {
          center: new google.maps.LatLng(42.680313,23.325762),
          zoom: 10
        };
      }
    }
  });

  Template.map.events = {
    'click #report-cop-btn': function () {
        console.log("detected click on the cop button");
        sendNotification(latestMapLatitude, latestMapLongitude, EVENT_TYPE_COP_DETECTED);
    },
    'click #report-big-hole-btn': function () {
        console.log("detected click on the hole button");
        sendNotification(latestMapLatitude, latestMapLongitude, EVENT_TYPE_HOLE_DETECTED);
    },
    'click #report-traffic-jam-btn': function () {
        console.log("detected click on the traffic jam button");
        sendNotification(latestMapLatitude, latestMapLongitude, EVENT_TYPE_TRAFFIC_JAM);
    },
  };
}
