so, the case study will be a group discussion plus presentation at the end to a panel; our app will
  record and transcribe live the conversation (using an interviewer's page). The flow is the interviewer
  will create an interview session, add participants into that session (5 participants with name, role
  etc.), then the interviewer will start the session, which access their microphone and begin
  transcribing the conversations during the discussions, then also during the presentation, with speaker
  diarization. The interviewer will assign [speaker 1/2/3] to the right participant name; every 60
  seconds the transcript will be posted to the backend in its consolidated form ([Participant A] Say
  something, [Participant B] something B says) and the backend will run the assessment evaluation through
  this transcript and return the structured evaluation results (and store in db) to the front end, to
  display in the Evaluation tab. The structuerd evaluation by competency, with score, rationale, and
  evidence, also how strong or weak the evidence is. If evidence is weak that competency score is not
  counted toward overall score (as unable to assess)\
  After the case study is done, the interviewer can save the session (even though transcript, and
  evalution should have been saved every 60 on post anyway), and click Next phase to go to the individual
  interview, where she will see a table for each participant and a unique link for that participant to
  their individual interview sessions, she will click a button to email all participants each with their
  link. This will lead them to the /interview/ page of the current app, with a difference that they will
  select one question out of 3; for the 2 competency (so total 2 questions), and we'll guide them before
  and during interview to follow the structured response in @"requirement_analysis/competency/Screenshot
  2025-11-25 at 08.34.28.png", after the 2 questions for competency they will be asked 2 more questions
  (self assessment/engagement), this does not require the framework, just show the question. Then once
  they finish and submit they go to the multiple choice question. Then they submit. While all this
  happening the interviewer can see on their page the progress, who has completed what and their answers
  (including the interview questions that have been transcribed), and the evaluations of the system.