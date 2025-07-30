# Windsurf Demo App

A demo application and tasks to demonstrate the power of the [Windsurf Editor](https://windsurf.ai/).

This entire application was written from scratch by Cascade in the Windsurf Editor, and you will be able to add some more!

## Prerequisites

- Python 3.12 or higher
- Node.js and npm

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd windsurf-demo
```

2. Install Python dependencies:
```bash
pip3 install -r requirements.txt
```

3. Start the Flask server:
```bash
python3 app.py
```

4. Open your web browser and navigate to:
```
http://localhost:5000
```

5. Play the game!


## Tasks to Understand Cascade

1. **Demonstrate Deep Reasoning over Knowledge**

Start a new Cascade, and copy in "Create random variability in how much value food cells add to the player, and make the sizes reflect the value." Cascade should run like the following, after which you can look at the diffs and accept all changes. Click to start video:

[![Watch the video](https://img.youtube.com/vi/dsB3hHz-Nfw/maxresdefault.jpg)](https://youtu.be/dsB3hHz-Nfw)

This demonstrates Cascade's abilities to:
- Use tools to search through existing codebases.
- Create multi-file multi-edit changes in a manner that is self-consistent.
- Allow you to accept multiple changes at once.

2. **Demonstrate Incorporation of Human Actions**

Right now, there is no decay mechanism to the score, so the big players will always stay big even if they don't move or try to continue to grow. So, let us add a decay mechanism. Start a new Cascade and just say "Hi" to start the Cascade. Now, go to `static/js/config.js` and add the following constants somewhere in the file. Click to start video:

```js
// Score decay mechanics
export const BASE_DECAY_RATE = 0.02;   // Base rate of score decay per second
export const DECAY_SCALE_FACTOR = 0.2; // How much size affects decay rate
``` 

Now, go to back to the Cascade and just type "Continue." Cascade should run somewhat like the follwing:

[![Watch the video](https://img.youtube.com/vi/aHrUPrO0Pxk/maxresdefault.jpg)](https://youtu.be/aHrUPrO0Pxk)

This demonstrates Cascade's abilities to:
- Reason about the actions that you are taking in the text editor and refer to them semantically.
- Be fully operating on the same state of the codebase as you are, without you needing to scope out the problem for a copilot or agent.

3. **Demonstrate Access to Tools**

Open up Cascade (Command + L), and type "Run all tests in static/js" You may need to prompt Cascade with more information about the repository, but generally you should see the following happen. Click to start video:

[![Watch the video](https://img.youtube.com/vi/Cq0HJ6y-nh8/maxresdefault.jpg)](https://youtu.be/Cq0HJ6y-nh8)

This demonstrates Cascade's abilities to: 
- Reason iteratively about your existing codebases.
- Suggest terminal commands and execute them within Cascade.
- Debug stacktraces by identifying and reasoning about relevant code.
- Suggest fixes to issues, making edit suggestions directly to your files.
- Allow you to introspect diffs and accept diffs line-by-line.


### Takeaways on Cascade

These should demonstrate the power of the Windsurf Editor to jointly reason deeply about your codebases, access a broad set of tools, and incorporate your own actions as a developer. 

Cascade will not always be perfect, and often you may find yourself asking Cascade follow ups to fix unexpected side effects, or just taking over entirely and ignoring the AI for more complex tasks. That is totally okay! Cascade is the most powerful AI assistant that you can still trust and iterate with.

## More Windsurf Editor Features

Check out our [Docs](https://docs.codeium.com) for even more examples and how to use features like Autocomplete, Supercomplete, Command, and more! There is AI integrated throughout the editor so that you get the optimal AI assistance where you want it, when you want it.
