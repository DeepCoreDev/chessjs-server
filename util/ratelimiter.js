const { uuid } = require('uuidv4');

const delay = (delayInms) => {
    return new Promise(resolve => setTimeout(resolve, delayInms));
  }
  

module.exports = {
    new(drip){
        const buckets = {}
        return async function(req, res, next){
            if(req.session.user){
                if(!buckets[req.session.user._id]){
                    buckets[req.session.user._id] = 0;
                    var interval = setInterval(() => {
                        buckets[req.session.user._id] += drip; // Fill that bucket
                        if(buckets[req.session.user._id] > drip*1000){
                            // Drop that bucket
                            delete buckets[req.session.user._id];
                            clearInterval(interval);
                        }
                    }, 1000);
                    next();
                }else{
                    if(buckets[req.session.user._id] >= 1){
                        buckets[req.session.user._id]--; // Used a request
                        next();
                    }else{
                        // Drop request
                        res.status(429);
                        res.send({message: `Bucket is at ${buckets[req.session.user._id]}`});
                    }
                }
            }else{
                if(!req.session.tag || !buckets[req.session.tag]){
                    await delay(Math.pow(drip, -1)*1000); // Make sure people can't just keep generating new sessions, so we wait the maximum
                    req.session.tag = uuid();
                    buckets[req.session.tag] = 0;
                    var interval = setInterval(() => {
                        buckets[req.session.tag] += drip; // Fill that bucket
                        if(buckets[req.session.tag] > drip*1000){
                            // Drop that bucket
                            delete buckets[req.session.tag];
                            delete req.session.tag;
                            clearInterval(interval);
                        }
                    }, 1000);
                    next(); // Let them go
                }else{
                    if(buckets[req.session.tag] >= 1){
                        buckets[req.session.tag]--; // Used a request
                        next();
                    }else{
                        // Drop request
                        res.status(429);
                        res.send({message: `Bucket is at ${buckets[req.session.tag]}`});
                    }
                }
            }
        }
    }
}