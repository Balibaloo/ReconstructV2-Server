

const http = require('http');

const webserver = http.createServer((req,res) => {
    if (req.url == '/nohomo') {
        res.write('lmao u gay')
        res.end();
    }
    if (req.url == '/') {
        res.write('boring')
        res.end();
    }
    if (req.url == '/nou') {
        res.write(JSON.stringify([1,2,3,4]))
        res.end();
    }

});


webserver.listen(2424)

console.log("connected")
