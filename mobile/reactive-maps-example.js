Markers = new Mongo.Collection('markers');
var EVENT_TYPE_COP_DETECTED = 0,
    EVENT_TYPE_HOLE = 1,
    EVENT_TYPE_DRIVER_CURRENT_POSITION = 2,
    IMAGES_FOLDER_PATH = "images/",
    currentLocationPosition,
    currentPositionMarker,
    latestMapLatitude,
    latestMapLongitude,
    googleMapInstance;

function sendNotification(latitude, longitude, notificationType) {
    Markers.insert({ lat: latitude, lng: longitude, type: notificationType });
}

function createMarker(latitude, longitude, type) {
    var markerIcon = getMarkerIconByType(type);
    var marker = new google.maps.Marker({
        draggable: true,
        icon: markerIcon,
        animation: google.maps.Animation.DROP,
        position: new google.maps.LatLng(latitude, longitude),
        map: googleMapInstance,
        id: new Date().toString()
    });
    return marker;
}

function getMarkerIconByType(notificationType) {
    switch (notificationType) {
        case EVENT_TYPE_COP_DETECTED:
            // return IMAGES_FOLDER_PATH + "car_icon.png";
            return "http://www.google.bg/url?sa=i&source=imgres&cd=&ved=0CAUQjBxqFQoTCKONx7HSpsgCFYgMLAodlj0JIQ&url=http%3A%2F%2Fvignette1.wikia.nocookie.net%2Fclubpenguin%2Fimages%2F8%2F83%2FCop_Cap_from_a_Player_Card.PNG%2Frevision%2Flatest%3Fcb%3D20121221140708&psig=AFQjCNE_oJ5r-JtDKhr7t5G2OzvSFvJFHQ&ust=1443973441389613";
        case EVENT_TYPE_HOLE:
            return "https://0.s3.envato.com/files/79678163/object-road-cone.jpg";
            // return IMAGES_FOLDER_PATH + "car_icon.png";
        case EVENT_TYPE_DRIVER_CURRENT_POSITION:
            return "https://cdn2.iconfinder.com/data/icons/auto-cars/154/auto-car-beetle-small-128.png";
            // return IMAGES_FOLDER_PATH + "car_icon.png";
        default:
            return IMAGES_FOLDER_PATH + "car_icon.png";
    }
}
if (Meteor.isClient) {
  Template.map.onCreated(function() {
    GoogleMaps.ready('map', function(map) {
      googleMapInstance = map.instance;
      google.maps.event.addListener(map.instance, 'click', function(event) {
        latestMapLatitude = event.latLng.lat();
        latestMapLongitude = event.latLng.lng();
        Markers.insert({ lat: latestMapLatitude, lng: latestMapLongitude });
      });
        function showPosition(data) {
            currentLocationPosition = data.coords;
            console.log("current position: ", data, Template.map);
            map.instance.setCenter(new google.maps.LatLng(currentLocationPosition.latitude, currentLocationPosition.longitude));
            updateCurrentPositionMarker();
        }
        function updateCurrentPositionMarker() {
            if (!currentPositionMarker) {
                currentPositionMarker = createMarker(currentLocationPosition.latitude, currentLocationPosition.longitude, EVENT_TYPE_DRIVER_CURRENT_POSITION);
            } else {
                currentPositionMarker.setPosition({ lat: currentLocationPosition.latitude, lng: currentLocationPosition.longitude });
            }
        }
        function checkCurrentPosition() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(showPosition);
            }
        }
        checkCurrentPosition();
        setInterval(checkCurrentPosition, 15000);

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

  Template.map.helpers({
    mapOptions: function() {
      if (GoogleMaps.loaded()) {
        return {
          center: new google.maps.LatLng(-37.8136, 144.9631),
          zoom: 10
        };
      }
    }
  });

  Template.map.events = {
    'click #report-cop-btn': function () {
        sendNotification(latestMapLatitude, latestMapLongitude, EVENT_TYPE_COP_DETECTED);
    }
  };
}
