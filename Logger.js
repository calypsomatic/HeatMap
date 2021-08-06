//Just writing a quick logger wrapper

export default class Logger {
  constructor(debug, file) {
    this.debug = debug;
    this.file = file;
  }

  // log(message){
  //   if (this.debug){
  //     console.log(message);
  //   }
  // }

  log(message1, message2){
    if (this.debug){
      if (message2){
        console.log(message1, message2);
      } else {
        console.log(message1);
      }
    }
  }

  group(message){
    if (this.debug){
      console.group(this.file, message);
    }
  }

  groupEnd(){
    if (this.debug){
      console.groupEnd();
    }
  }
}
