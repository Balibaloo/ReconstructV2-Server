function newOBJ(x) {
    this.somevar = x
    this.number = 10
    return this
}

var mynewnewobj = newOBJ('another string');
var mynewobj = newOBJ('fucker');


newOBJ.prototype.newval = 'lets try something new'




console.log(mynewobj.somevar)
console.log(mynewnewobj.somevar)