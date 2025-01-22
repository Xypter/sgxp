function setupSonicAnimation() {
    const sonic = document.querySelector('.sonic-trigger');
    const audio = new Audio('https://cdn.sgxp.me/themes/ark/30%20-%20Event-%20The%20Last%20Scene.mp3');
    
    sonic.addEventListener('click', () => {
        // Log event to Umami Analytics
        fetch('https://analytics.sgxp.me/api/collect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                website: 'c78c6fb7-bd5f-4715-8af5-f794ad7b3584', // Your website ID
                event: 'sonic-trigger-clicked', // Custom event name
                url: window.location.pathname,  // Track current page
                referrer: document.referrer,   // Track the referrer
                time: new Date().toISOString() // Timestamp
            })
        })
        .then(response => response.json())
        .catch(error => console.error('Error logging Umami event:', error));

        // Play the audio
        audio.play();
        
        // Add animation classes
        document.body.classList.add('animating');
        document.body.classList.add('fade-out-content'); // Changed from .container to body
        
        // After content fade, start zoom
        setTimeout(() => {
            document.body.classList.add('zoom-to-sonic');
        }, 3000);
        
        // After zoom animation ends, delay 2 seconds, then show image and text
        setTimeout(() => {
            const image = document.createElement('img');
            image.src = 'https://cdn.sgxp.me/themes/ark/speech_bubble1.png'; // Replace with your image URL
            image.classList.add('final-image');
            document.body.appendChild(image);

            const textContainer = document.createElement('div');
            textContainer.classList.add('typing-text');
            document.body.appendChild(textContainer);

            const text = "Sayonara,\nShadow The Hedgehog"; // Add newline character after "Sayonara,"
            let index = 0;

            function typeText() {
                if (index < text.length) {
                    // Handle newline character and insert <br> for line break
                    if (text.charAt(index) === '\n') {
                        textContainer.innerHTML += '<br>'; // Insert a line break
                    } else {
                        textContainer.innerHTML += text.charAt(index); // Use innerHTML instead of textContent
                    }
                    index++;
                    setTimeout(typeText, 100); // Typing speed
                }
            }

            setTimeout(typeText, 2000); // Delay before typing starts

            // After text finishes typing, add delay, then show Shadow image at top-right with fade-in effect
            setTimeout(() => {
                const shadowImage = document.createElement('img');
                shadowImage.src = 'https://cdn.sgxp.me/themes/ark/230-2303693_shadow-the-hedgehog-sonic-adventure-2-shadow.png';
                shadowImage.classList.add('shadow-image'); // Add a class for styling
                document.body.appendChild(shadowImage);

                // Trigger fade-in by adding a class after a 2-second delay
                setTimeout(() => {
                    shadowImage.classList.add('fade-in'); // Add fade-in class
                }, 10); // Small delay before adding the class

                // After the Shadow image fades in, show the "Go Back to SGXP" button with fade-in
                setTimeout(() => {
                    const backButton = document.createElement('button');
                    backButton.innerText = 'Go Back to SGXP';
                    backButton.classList.add('go-back-button'); // Add a class for styling the button
                    document.body.appendChild(backButton);

                    // Trigger fade-in effect for the button
                    setTimeout(() => {
                        backButton.classList.add('fade-in'); // Add fade-in class for the button
                    }, 10); // Small delay before adding the class

                    // Set the button click event to redirect the user back
                    backButton.addEventListener('click', () => {
                        window.location.href = 'https://sgxp.me'; // Change this URL to the SGXP website or desired link
                    });
                }, 2000); // Delay after Shadow image fade-in before showing the button

            }, text.length * 100 + 2000); // Wait until text finishes + 2s delay

            // Restart the parallax animation after zoom ends
            setTimeout(() => {
                // Remove and re-add the animating class to restart the parallax animation
                document.body.classList.remove('animating');
                void document.body.offsetWidth; // Trigger reflow to reset animations
                document.body.classList.add('animating');
            }, 12000); // Restart the parallax 12 seconds after the zoom starts (end of zoom + delay)
        }, 12000); // Zoom animation duration (10s) + 2s delay
    });
}

document.addEventListener('DOMContentLoaded', setupSonicAnimation);
