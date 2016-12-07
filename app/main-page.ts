import { EventData } from 'data/observable';
import { Page } from 'ui/page';
import { Button } from 'ui/button';
import { SpeechViewModel } from './main-view-model';

declare var interop, NSLocale, SFSpeechRecognizer, SFSpeechAudioBufferRecognitionRequest, SFSpeechRecognizerAuthorizationStatus, AVAudioEngine, AVAudioSession, AVAudioSessionCategoryRecord, AVAudioSessionModeMeasurement;
let page: Page, model: SpeechViewModel, recordButton: Button, locale, speechRecognizer, recognitionRequest, recognitionTask, audioEngine;

// Event handler for Page 'navigatingTo' event attached in main-page.xml
export function onPageLoaded(args: EventData) {
    // Get the event sender
    page = <Page>args.object;
    recordButton = <Button>page.getViewById('startRecording');

    // Create the model
    model = new SpeechViewModel();
    page.bindingContext = model;

    // Initialize the speech recognizer and audio engine
    locale = new NSLocale('en-US');
    speechRecognizer = SFSpeechRecognizer.alloc().initWithLocale(locale);
    audioEngine = AVAudioEngine.new();

    //speechRecognizer.delegate = speechRecognizerDelegate;

    // Ask for user's permission to use speech recognition
    // The microphone button is disabled until the speech recognizer is activated
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

    // Check if speech recognition is available on the device
    if(!speechRecognizer.available){
        alert('Speech Recognition is not available on this device.');
        return;
    }

    /* If the audio engine is running then stop it and finish
       the speech recognition request, otheriwse start recording */
    if (audioEngine.running) {
        audioEngine.stop();

        if (recognitionRequest) {
            recognitionRequest.endAudio();
        }

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

    // Initialize the audio session
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

    // Create the recognition request
    let recognitionRequest = SFSpeechAudioBufferRecognitionRequest.new();

    // Check the audio engine's input mode to make sure we can record audio
    let inputNode = audioEngine.inputNode;

    if (!inputNode) {
        console.log('Audio engine has no input node');
    }

    if (!recognitionRequest) {
        console.log('Unable to create an SFSpeechAudioBufferRecognitionRequest object');
    }

    recognitionRequest.shouldReportPartialResults = true;

    // Start the speech recognition task
    recognitionTask = speechRecognizer.recognitionTaskWithRequestResultHandler(recognitionRequest, function(result, error) {
        let isFinal = false;

        if (result) {
            model.set('speechText', result.bestTranscription.formattedString);
            isFinal = result ? result.isFinal : false;
        }

        if (error || isFinal) {
            audioEngine.stop();
            inputNode.removeTapOnBus(0);

            recognitionRequest = null;
            recognitionTask = null;

            model.set('recordButtonEnabled', true);
        }
    });

    inputNode.installTapOnBusBufferSizeFormatBlock(0, 1024, inputNode.outputFormatForBus(0), function(buffer, when) {
        if (recognitionRequest) {
            recognitionRequest.appendAudioPCMBuffer(buffer);
        }
    });

    audioEngine.prepare();

    try {
        audioEngine.startAndReturnError();
    } catch (ex) {
        console.log(ex);
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
