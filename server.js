/*
 *
 *  Moves API Stuff
 *  movesAuth ()                        -  Begins oauth flow. Redirects window to appropriate URL from backend call
 *
 *  movesRequestToken (code)            - uses code from above, which is stored via client side
 *                                        request in user_settings.movesCode
 *
 *  movesApi (userId,action,parameters) - Looks up users token via user id inside user_settings.movesToken, stored in method above server side.
 *                                        Uses action to add to end of URI, supports activities/daily and places/daily, enforced server-side.
 *                                        Attaches access_token= parameter at end of statement. Stores activities/daily to user_moves_activities,
 *                                        stores places/daily to user_moves_places (with some minor modification to record structure)
 */
Meteor.publish("userMovesActivities",
  function(userId,showDays,startDay){
    
    if(typeof userId != "undefined" && userId != null  && !_.isUndefined(showDays) && !_.isUndefined(startDay)) {
    
      var dates = genDates(showDays,startDay);
      var endDay = dates.pop();
      //var start =stringToDate(startDay), end = stringToDate(endDay);
      endDay = parseInt(endDay);
      startDay = parseInt(startDay);
      // make function return first or just last date ?
      //console.log('\n' + userId + '\t' + showDays + '\t' + startDay + '\t' + endDay);
      if(dates.length > 0 && dates.length < 200){
//        console.log(end.toDate());
        //return true;
        var q = user_activities.find({date:{ "$gt" : startDay} ,owner:userId});
        if(q){
          //console.log(q.fetch());
          return q;
        }else{
          console.log('\n problem with query');
          console.log(q);
        }
      }else if(dates.length >= 200){
        return user_activities.find({owner:userId});
      }
      else{
        return false;
      }
    }
  }
);
/*
Meteor.publish("userMovesStoryline",
  function(userId,showDays,startDay){
    if(typeof userId != "undefined" && userId != null  && !_.isUndefined(showDays) && !_.isUndefined(startDay)) {
      var dates = genDates(showDays,startDay);
      var endDay = dates.pop();
      var start =stringToDate(startDay), end = stringToDate(endDay);
      console.log(start);
      console.log(endDay);
      // make function return first or just last date ?
      if(dates.length > 0 && dates.length < 200){
        return user_activities.find({date:{"$gte" : parseInt(start), "$lt" : parseInt(end) },owner:userId});
      }else if(dates.length >= 200){
        return user_activities.find({owner:userId});
      }
      else{
        return false;
      }
    }
  }
);
*/

Meteor.methods({
    movesAuth : function(){
        var settings = getSettings("moves");
        
        if(typeof settings.client_id != "undefined"){
            if(typeof settings.client_secret != "undefined"){
                var base_url = "https://api.moves-app.com/oauth/v1/authorize?response_type=code&client_id=";
                return base_url + settings.client_id + "&scope=activity%20location" ;
            }
        }
        return false;
    },
    removeStoryline : function(userId){
        if(typeof userId != "undefined" && userId){
          if(user_moves_storyline.remove({owner:userId})){
            return user_activities.remove({owner:userId});
          }
        }
        return false;
    },
    movesRequestToken : function(code){

        var settings = Meteor.settings;
        if(typeof settings != 'undefined'){

            if(typeof settings.moves != 'undefined'){
                settings = settings.moves;
                if(typeof settings.client_id != "undefined"){
                    if(typeof settings.client_secret != "undefined"){
                        var post_request = {params : {
                        grant_type : "authorization_code",
                        code : code,
                        client_id : settings.client_id,
                        client_secret : settings.client_secret,
                        redirect_uri : settings.redirect_uri
                        }};

                        Meteor.http.post( "https://api.moves-app.com/oauth/v1/access_token" ,post_request,function(error,result){
                            if( typeof result != "undefined"){
                                if(result.statusCode == 200){
                                //console.log('token obtained from moves');

                                if(typeof result.data != "undefined")
                                if(typeof result.data.access_token != "undefined")
                                // give user their moves token ...
                                user_settings.update({movesCode : code},
                                {"$set": {movesToken : result.data.access_token} });
                                }else{
                                console.log('Moves token request returned error');
                                console.log(result);
                                return result.data;
                                }
                            }else{
                                console.log('something bad happened when movesRequestToken ran');
                                console.log(error);
                            }
                        });
                    }
                }
            }
        }
        return false;
    },
    movesApi : function (userId,action,parameters){
        var serialize =
            function(obj) {
                var str = [];
                for(var p in obj)
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            };

        // get api key
        var q = user_settings.findOne({owner:userId});
        if(q && typeof userId != "undefined" && typeof action != "undefined"){
        if (typeof q.movesToken != "undefined" && typeof q.movesCode != "undefined"){
          
            Meteor.http.get(  "https://api.moves-app.com/api/1.1/user/" + action +  (typeof parameters != "undefined" ? "?" + serialize(parameters) + "&" : "?" ) +  "access_token=" + q.movesToken ,
                function(error,result){

                    if(result.content == "expired_access_token"){
                        // remove fields from record ....
                        user_settings.update({owner: userId}, {"$unset":{movesCode:"",movesToken:""} });
                        return false;
                    }

                    if(action == "places/daily" && result.data != null){
                    result.data.filter(
                    function(arr){
                        //console.log(arr.date);
                        var date = arr.date;
                        var segments = [];
                        // clean up segments array field to make less verbose. Should be ok.
                        arr.segments.filter(function(arr2){
                                  var new_segment = {};
                                  new_segment.id = arr2.place.id;
                                  new_segment.date = arr.date;
                                  new_segment.name = arr2.place.name;
                                  new_segment.type = arr2.place.type;
                                  new_segment.lat = arr2.place.location.lat;
                                  new_segment.lon = arr2.place.location.lon;
                                  new_segment.startTime = arr2.startTime;
                                  new_segment.endTime = arr2.endTime;
                                  segments.push(new_segment);
                                  });

                        var new_record = {};
                        new_record.date = stringToDate(arr.date);
                        
                        if(segments.length > 0)
                          
                            new_record.segments = segments;
                            // check to see if date does not exist support upsert !!!?
                              var check = user_moves_storyline.find({owner: userId,date: new_record.date},{ fields: {_id:1} }).fetch();

                            if(check.length == 1) {
                                user_moves_storyline.remove({_id:check[0]._id});
                            }else if(check.length > 1){
                                check.filter(function(arr){ user_moves_storyline.remove({_id: arr_id});}) ;
                            }
                            new_record.owner = userId;
                            user_moves_places.insert( new_record );
                            });
                        // store to places
                        }else if(action == "activities/daily"){
                         // console.log("\t\t activities/daily");
                        // no change for this data structure since activities are more embedded and don't feel like
                        // doing time difference calculations for now ...
                            if(result.data != null)
                                result.data.filter(
                                function(arr){
                                    var new_record = arr;
                                    new_record.owner = userId;
                                    // check to see if date does not exist support upsert !!!?
                                    user_activities.insert( new_record );
                                });
                            else{
                                user_settings.update({owner: userId },{$set: { movesCode : undefined, movesToken:undefined } });
                                return {error : "expired access token"};
                            }
                        }else if(action == "storyline/daily" || typeof parameters.trackPoints != "undefined"){
                            
                            if(typeof result != "undefined" && typeof result.data != "undefined" && result.data != null){
                            // if date is NOT today?
                                if(typeof result != "undefined" && typeof result.data != "undefined" && result.data){
                                  
                                    var new_record = result.data[0];
                                    var check = undefined;
                                    if(new_record != null){
                                        var today = moment().format("YYYYMMDD");
                                        
                                        if(today == result.data[0].date){
                                          check = user_moves_storyline.findOne({owner:userId,date:today},{ fields: {_id:1} });
                                          
                                          if(check && typeof check.date != "undefined") {
                                              console.log("removing single date " +  check.date);
                                              user_moves_storyline.remove({_id:check._id});
                                              user_activities.remove({ref_id : check._id});
                                              check = undefined;
                                            
                                          }
                                        }else {
                                          check = user_moves_storyline.findOne({owner:userId,date:result.data[0].date},{ fields: {_id:1} });
                                          // check to see that date isn't too far back ... only go back three days?
                                          // make sure other days dont get reinserted?
                                          //var theDates = genDates(moment().subtract(3,"days").format("YYYYMMDD"),3);
                                          //console.log(theDates); 
                                           //console.log('date is not today!'); 
                                            //check = user_moves_storyline.find({owner:userId,date:result.data[0].date}).fetch();
                                        }
                                      if(typeof check == "undefined" || !check ){
                                          //console.log('did not pass check.. looking up new record ?');
                                          //new_record.owner = Meteor.userId();
                                          //console.log(new_record.segments);
                                        if(typeof new_record.segments != "undefined" && new_record.segments){
                                          //console.log('attempting insert');
                                          var ref_id = user_moves_storyline.insert({owner:Meteor.userId(),date:new_record.date});
                                          //console.log(ref_id);
                                          var theOwner = Meteor.userId();
                                          //console.log(new_record);
                                        new_record.segments.filter(function(arr,x){
//                                          console.log(arr);
                                          if(typeof arr.activities != "undefined" && arr.activities.length > 0)
                                            arr.activities.filter(function(obj,n){
                                               //var new_arr = obj;
                                             // console.log(obj);
                                              var new_arr = {activity : obj.activity, startTime : obj.startTime,date : parseInt(new_record.date)}; 
                                              var modTrackPoints = [];
                                              //this.block();
                                              obj.trackPoints.filter(function(obj2){
                                                return modTrackPoints.push([obj2.lat,obj2.lon]);
                                              });
                                              //console.log(modTrackPoints);
                                               new_arr.trackPoints = modTrackPoints;
                                               new_arr.ref_id = ref_id;
                                               // have to set x equal to 1 because when in a place record no activities will be present
                                               if( n === 0 && typeof arr.place != "undefined" && typeof new_record.summary != "undefined"){
                                                 
                                                 // this so we can add a marker to keep it simple and datastructures compact
                                                 new_arr.place_name = arr.place.name;
                                                 new_arr.place_loc = [arr.place.location.lat,arr.place.location.lon];
                                                 // generate summary data here?
                                                 new_arr.summary = new_record.summary;
                                               }

                                               new_arr.owner = theOwner;
                                              // use the start/end time to essentially reference ? or store a reference id field? maybe to quickly
                                              // hide show all activities via mongo id?
                                               //new_arr.startTime= stringToTime(new_arr.startTime);
                                               //new_arr.endTime= stringToTime(new_arr.endTime);
                                               //console.log(new_arr);
                                               var query = user_activities.insert(new_arr);
                                              //console.log('\n' + query);
                                            });
                                         
                                        });
                                         //new_record = _.omit(new_record,"segments");
                                         //new_record = _.omit(new_record,"summary");

                                          }
                                          //if(typeof new_record.place != "undefined"){
                                          //  console.log(new_record.place);
                                          //}
                                          //new_record.date = stringToDate(new_record.date);
                                        //console.log(new_record);
                                            //console.log(new_record.date);
                                        // can we do upserts yet? please ?
                                       
                                          //user_moves.insert()
                                        }
                                    }else{
                                        console.log('weird return data');
                                    }
                                    }else{
                                        console.log("Storyline/daily did not return a resultset");
                                    }
                                }
                            }
                }) ;
        }
        }
      return false;
    },
    movesApiStoryline :
        function(userid,days){
            //this.unblock();
            if(typeof userid != "undefined"){
                if(typeof days == "undefined")
                    days = 7;

                var today = moment().format("YYYYMMDD");
              //console.log(today);
                // todays day ...
                for(var x = 0;x <= days; x++){
                    var the_day =  moment().subtract('days',x).format("YYYYMMDD");
                // force string ?
                    the_day = the_day + '';
                  //console.log('the day:' + the_day);
                    // this call SUCKS and is probably making shit crawl
                    var pre_check = user_moves_storyline.findOne({owner:userid,startDay:the_day},{ fields: {_id:1} });
                    //console.log(pre_check);
                    if(!pre_check){
                        Meteor.call("movesApi",userid, "storyline/daily/" + the_day, {trackPoints:true},function(error,result) { if(typeof error != "undefined") console.log(error);} );
                    }else{
                        // if the record was created within the last week destroy it so we can call it anyway again
                        // are we deleting and removing every time?
                        user_moves_storyline.remove({_id : pre_check._id, date:today});
                        Meteor.call("movesApi",userid, "storyline/daily/" + the_day, {trackPoints:true},function(error,result) { if(typeof error != "undefined") console.log(error);} );
                    }
                }
                return 2;
            }
        // automatically get a specific number of days
        // to get track points systematically one day at a time ...
         return false;
    },
    movesApiStorylineCount : function(userId){
        return user_moves_storyline.find({owner:userId},{date:1}).fetch().length;
    }
});