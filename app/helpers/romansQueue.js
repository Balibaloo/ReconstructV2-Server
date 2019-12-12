class romansQueue {
    constructor() {
        this.data = [];
    }

    enqueue(element) {
        this.data.push(element);
    }

    dequeue() {
        return this.data.shift();
    }

    first() {
        return this.data[0];
    }

    last() {
        return this.data[this.data.length - 1];
    }

    size() {
        return this.data.length;
    }

    isEmpty() {
        return this.data.length === 0;
    }
}

module.exports.customQueue = romansQueue;