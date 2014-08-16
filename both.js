
var default_permissions = {
    insert:function(userId,doc){
        return (userId && doc.owner === userId);
    },
    update:function(userId,doc,fields,modifier){
        return doc.owner === userId;
    },
    remove:function(userId,doc){
        return doc.owner === userId;
    },
    fetch: ['owner']
};

/*
user_segments = new Meteor.Collection("user_segments");
user_segments.allow(default_permissions);
*/

user_moves_storyline = new Meteor.Collection("user_moves_storyline");
user_moves_storyline.allow(default_permissions);
user_activities = new Meteor.Collection("user_activities");
user_activities.allow(default_permissions);