import { EventData } from 'data/observable';
import { Page } from 'ui/page';
import { Button } from 'ui/button';
import { SpeechViewModel } from './main-view-model';

declare var interop, NSLocale, SFSpeechRecognizer, SFSpeechAudioBufferRecognitionRequest, SFSpeechRecognizerAuthorizationStatus, AVAudioEngine, AVAudioSession, AVAudioSessionCategoryRecord, AVAudioSessionModeMeasurement;
let page: Page, model: SpeechViewModel, recordButton: Button, locale, speechRecognizer, recognitionRequest, recognitionTask, audioEngine;

// Event handler for Page 'navigatingTo' event attached in main-page.xml
export function navigatingTo(args: EventData) {
    // Get the event sender
    page = <Page>args.object;
    recordButton = <Button>page.getViewById('startRecording');

    // Create the model
    model = new SpeechViewModel();
    page.bindingContext = model;

    // Initialize the speech recognizer and audio engines
    locale = new NSLocale('en-US');
    speechRecognizer = new SFSpeechRecognizer(locale);
    audioEngine = new AVAudioEngine();

    speechRecognizer.delegate = speechRecognizerDelegate;

    SFSpeechRecognizer.requestAuthorization(function(authStatus) {
        switch (authStatus) {
            case SFSpeechRecognizerAuthorizationStatus.Authorized:
                model.set('recordButtonEnabled', true);
                console.log('User authorized access to speech recognition');
                break;
            case SFSpeechRecognizerAuthorizationStatus.Denied:
                model.set('recordButtonEnabled', false);
                console.log('User denied access to speech recognition');
                break;
            case SFSpeechRecognizerAuthorizationStatus.Restricted:
                model.set('recordButtonEnabled', false);
                console.log('Speech recognition restricted on this device');
                break;
            case SFSpeechRecognizerAuthorizationStatus.NotDetermined:
                model.set('recordButtonEnabled', false);
                console.log('Speech recognition not yet authorized');
        }
    });
}

export function recordButtonTapped() {
    console.log('Audio engine running: ', audioEngine.isRunning);
    if (audioEngine.isRunning) {
        audioEngine.stop();
        if (recognitionRequest) {
            recognitionRequest.endAudio();
        }
        model.set('recordButtonEnabled', false);
        model.set('recordButtonText', SpeechViewModel.RECORD_START);
    } else {
        startRecording();
        model.set('recordButtonText', SpeechViewModel.RECORD_STOP);
    }
}

export function startRecording() {
    if (recognitionTask != null) {
        recognitionTask.cancel();
        recognitionTask = null;
    }

    console.log('Initialize audio session');
    let audioSession = AVAudioSession.sharedInstance();

    let errorRef = new interop.Reference();

    audioSession.setCategoryError(AVAudioSessionCategoryRecord, errorRef);
    if (errorRef.value) {
        console.log(`setCategoryError: ${errorRef.value}`);
    }

    audioSession.setModeError(AVAudioSessionModeMeasurement, errorRef);
    if (errorRef.value) {
        console.log(`setModeError: ${errorRef.value}`);
    }

    audioSession.setActiveError(true, null);

    console.log('Create the recognition request');
    let recognitionRequest = new SFSpeechAudioBufferRecognitionRequest();

    let inputNode = audioEngine.inputNode;
    if (!inputNode) {
        console.log('Audio engine has no input node');
    }

    if (!recognitionRequest) {
        console.log('Unable to create an SFSpeechAudioBufferRecognitionRequest object');
    }

    recognitionRequest.shouldReportPartialResults = true;

    console.log('Start the recognition task');
    console.log('Recognizer:', speechRecognizer);
    console.log('Available:', speechRecognizer.available);
    recognitionTask = speechRecognizer.recognitionTask(recognitionRequest, function(result, error) {
        let isFinal = false;

        if (result) {
            model.set('speechText', result.bestTranscription.formattedString);
            isFinal = result ? result.isFinal : false;
        }

        if (error || isFinal) {
            audioEngine.stop();
            inputNode.removeTap(0);

            recognitionRequest = null;
            recognitionTask = null;

            model.set('recordButtonEnabled', true);
        }
    });

    let recordingFormat = inputNode.outputFormat(0);
    inputNode.installTap(0, 1024, recordingFormat, function(buffer, when) {
        if (recognitionRequest) {
            recognitionRequest.append(buffer);
        }
    });

    audioEngine.prepare();

    try {
        audioEngine.start();
    } catch (ex) {
        console.log('audioEngine couldn\'t start because of an error.');
    }

    model.set('speechText', 'Say something, I\'m listening!');
}

export function speechRecognizerDelegate(speechRecognizer, available) {
    if (available) {
        model.set('recordButtonEnabled', true);
    } else {
        model.set('recordButtonEnabled', false);
    }
}
