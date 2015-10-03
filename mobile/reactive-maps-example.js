Markers = new Mongo.Collection('markers');
var EVENT_TYPE_COP_DETECTED = 0,
    EVENT_TYPE_HOLE_DETECTED = 1,
    EVENT_TYPE_DRIVER_CURRENT_POSITION = 2,
    IMAGES_FOLDER_PATH = "images/",
    currentLocationPosition,
    currentPositionMarker,
    latestMapLatitude,
    latestMapLongitude,
    googleMapInstance;

function sendNotification(latitude, longitude, notificationType) {
    console.log('sendNotification', latitude, longitude);
    Markers.insert({ lat: latitude, lng: longitude, type: notificationType});
}

function createMarker(latitude, longitude, type) {
    console.log('createMarker', latitude, longitude, type);
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
             return "https://photos-4.dropbox.com/t/2/AAAeQHHWkd_tfWCu8iBksAlyH6mMZQsCD2ruqBQeXRjRzA/12/386211175/png/32x32/1/_/1/2/rsz_cop_cap_from_a_player_card.png/EKPX04kDGKQHIAIoAg/Gmm_3bErGN-6vW-6E2tI76jSbezyBkSh0jo13_imhsw?size=1024x768&size_mode=2";
        case EVENT_TYPE_HOLE_DETECTED:
            return "https://scontent.xx.fbcdn.net/hphotos-xla1/v/t34.0-12/12071491_884081898351938_1029038919_n.jpg?oh=52c4a31f34dc16877b5c0d06a0841a21&oe=5611BED9";
         case EVENT_TYPE_DRIVER_CURRENT_POSITION:
            return "https://scontent.xx.fbcdn.net/hphotos-xpt1/v/t34.0-12/12081547_884081931685268_1370675732_n.jpg?oh=b268cb3de7aac30a4093552931319f4c&oe=5611C9CC"
        default:
            return "https://scontent.xx.fbcdn.net/hphotos-xpt1/v/t34.0-12/12081547_884081931685268_1370675732_n.jpg?oh=b268cb3de7aac30a4093552931319f4c&oe=5611C9CC"
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
            latestMapLongitude = data.coords.longitude;
            latestMapLatitude = data.coords.latitude;
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
          center: new google.maps.LatLng(42.680313,23.325762),
          zoom: 20
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
        console.log("detected click on the cop button");
        sendNotification(latestMapLatitude, latestMapLongitude, EVENT_TYPE_HOLE_DETECTED);
    }
  };
}
