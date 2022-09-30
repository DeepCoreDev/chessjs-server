module.exports = {
    collectparams: function(data){
        let parts = data.split("&");
        let output = {};
        for(let i = 0; i < parts.length; i++){
            let m = parts[i].split("=");
            output[m[0]] = m[1];
        }
        return output;
    }
}