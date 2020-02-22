// list of all words to filter out when adding tags
const nonTagsList = `

the a an in with

`.split(" ")


// remove non tag keywords
module.exports.pruneNonTagsFrom = (tagList) => {
    // filter out a word if it is in the nonTagsList
    tagList = tagList.filter((value) => {
        
        if (value in this.nonTagsList) {
            return false

        } else 
            return true
    })
    return tagList
}