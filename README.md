#Meteor Moves API Package
This is definately a work in progress, but am rewriting it to not be as cruddy as when it was originally written for [Trail](https://trail.meteor.com) First order of buisness is using the meteor accounts systems to store oauth keys. 
##Settings
This package depends on Meteor.settings so you'll need to launch your application so that it runs with a json file that has an entry that looks something like this:
###settings.json
```javascript
  {
  "moves" : {
             "client_id" : "client_id",
 	           "client_secret" : "client_secret",
	            "redirect_uri": "http://youroauth_callback_endpoint/"
            }
   }
```
Then running 
```
meteor --settings settings.json
```

##Collections Used
###Your model.js
```javascript
// stores oauth key, legend color settings
user_settings = new Meteor.Collection("user_settings");
// stores poly lines (movement)
user_moves_storyline = new Meteor.Collection("user_moves_storyline");
// stores activities
user_activities = new Meteor.Collection("user_activities");
```
You may need to use .allow() depending on your clientside interactions.

##Pub/sub

```javascript
// using moment to return a range of dates of a single day,
// needs a integer number and a date formatted "YYYYMMDD"
 showRange = [7,moment().subtract(6,"days").format("YYYYMMDD")];
 Meteor.subscribe("userMovesActivities",Meteor.userId(),showRange[0],showRange[1])
```
##Moves API Stuff
###movesAuth ()
oauth flow. Redirects window to appropriate URL from backend call

###movesRequestToken (code)
Uses code from above, which is stored via client side request in user_settings.movesCode

###movesApi (userId,action,parameters)
Looks up users token via user id inside user_settings.movesToken, stored in method above server side. Uses action to add to end of URI, supports activities/daily and places/daily, enforced server-side. Attaches access_token= parameter at end of statement. Stores activities/daily to user_moves_activities, stores places/daily to user_moves_places (with some minor modification to record structure)
