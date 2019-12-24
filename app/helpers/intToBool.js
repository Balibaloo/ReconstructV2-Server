
module.exports.intToBool = (obj) => {
    // scrapes through an object and sets any (0/1) integers to (false/true)
    for (var property in obj){
        if (Array.isArray(obj[property])){
            obj[property] = obj[property].map((item) => {
                return this.intToBool(item)
            })

        } else if (typeof obj[property] == typeof 1){
            if (obj[property] == 1) {obj[property] = true}
            if (obj[property] == 0) {obj[property] = false}

        } else if (typeof obj[property] == typeof {}){
            obj[property] = this.intToBool(obj[property])
        }}
        
    return obj    
    }
