import {Observable} from 'data/observable';

export class SpeechViewModel extends Observable {

    public static RECORD_START: string = 'Start Recording';
    public static RECORD_STOP: string = 'Stop Recording';

    constructor() {
        super();
        this.recordButtonEnabled = false;
        this.recordButtonText = SpeechViewModel.RECORD_START;
        this.speechText = '';
    }

    get recordButtonEnabled() {
        return this.get('_recordButtonEnabled');
    }

    set recordButtonEnabled(value: boolean) {
        this.set('_recordButtonEnabled', value);
    }

    get recordButtonText() {
        return this.get('_recordButtonText');
    }

    set recordButtonText(value: string) {
        this.set('_recordButtonText', value);
    }

    get speechText() {
        return this.get('_speechText');
    }

    set speechText(value: string) {
        this.set('_speechText', value);
    }
}
