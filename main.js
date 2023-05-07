// 1. render song info in playlist => ok
// 2. scrolltop animation => ok
// 3. play / pause / seek (moving/skipping
// to new timestamp) => ok
// 4. cd rotate => ok
// 5. next / prev => ok
// 6. random => ok
// 7. repeat => ok
// 8. active song => ok
// 9. scroll active song into view => ok
// 10. play song when clicked => ok

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const PLAYER_STORAGE_KEY = "F8_PLAYER";

const dashboard = $(".dashboard");
const heading = $("header h2");
const cd = $(".cd");
const cdThumb = $(".cd-thumb");

const audio = $("#audio");

const player = $(".player");
const playBtn = $(".btn-toggle-play");

const currentTimeText = $(".current-time");
const progress = $("#progress");
const totalDuration = $(".total-duration");

const next = $(".btn-next");
const prev = $(".btn-prev");
const random = $(".btn-random");
const repeat = $(".btn-repeat");

const playlist = $(".playlist");

// an array which stores already played songs
let playedSongs = [];

const app = {
    // 1. PROPERTIES
    // get first index of array
    currentIndex: 0,
    // playlist
    songs: [
        {
            name: "Faded",
            singer: "Alan Walker",
            path: "./music/Faded.mp3",
            image: "./images/faded.png",
        },
        {
            name: "Falling Down",
            singer: "Wild Cards ft. James Delaney",
            path: "./music/fallingdown.mp3",
            image: "./images/fallingdown.jpg",
        },
        {
            name: "Rather Be",
            singer: "Clean Bandit ft. Jess Glynne",
            path: "./music/Rather Be.mp3",
            image: "./images/ratherbe.jpg",
        },
        {
            name: "STAY",
            singer: "The Kid LAROI, Justin Bieber",
            path: "./music/stay.mp3",
            image: "./images/stay.png",
        },
    ],
    // check if song is playing
    isPlaying: false,
    // check random
    isRandom: false,
    // check repeat
    isRepeat: false,
    // configurations
    config: JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY)) || {},

    // 2. METHODS
    setConfig(key, value) {
        // set key and value for object "config"
        this.config[key] = value;
        localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(this.config));
    },

    // render song info to playlist
    render() {
        const html = this.songs
            .map((song, index) => {
                return `
                    <div class="song" data-index="${index}">
                        <div
                            class="thumb"
                            style="
                                background-image: url('${song.image}');
                            "
                        ></div>
                        <div class="body">
                            <h3 class="title">${song.name}</h3>
                            <p class="author">${song.singer}</p>
                        </div>
                        <div class="option">
                            <i class="fas fa-ellipsis-h"></i>
                        </div>
                    </div>
                `;
            })
            .join("");

        playlist.innerHTML = html;
    },

    // define new properties
    defineProperties() {
        // static method to define new properties into object
        Object.defineProperty(this, "currentSong", {
            // getter
            get: function () {
                return this.songs[this.currentIndex];
            },
        });
    },

    // handle all events
    handleEvents() {
        const _this = this;
        console.log(this);
        // spin cd
        const cdThumbAnimate = cdThumb.animate(
            [{ transform: "rotate(360deg)" }],
            {
                duration: 10000, // 10 sec
                iterations: Infinity,
            }
        );
        cdThumbAnimate.pause();

        // handle shrink or enlarge thumbnail
        const cdWidth = cd.offsetWidth; // 200

        document.addEventListener("scroll", function () {
            const scrollTop =
                window.scrollY || document.documentElement.scrollTop;

            const newCdWidth = cdWidth - scrollTop;

            // only set width if newCdWidth is positive number.
            cd.style.width = newCdWidth > 0 ? newCdWidth + "px" : 0;
            cd.style.opacity = newCdWidth / cdWidth;
        });

        // handle play song event
        playBtn.addEventListener("click", function () {
            if (_this.isPlaying) {
                audio.pause();
            } else {
                audio.play();
            }
        });

        // listen when a song played
        audio.addEventListener("play", function () {
            _this.isPlaying = true;
            player.classList.add("playing");
            cdThumbAnimate.play();

            // when a song is played, its always actived
            _this.activeSong();
        });

        // listen when a song paused
        audio.addEventListener("pause", function () {
            _this.isPlaying = false;
            player.classList.remove("playing");
            cdThumbAnimate.pause();
        });

        // listen when song is curently playing (when song is seek this event
        // fired too)
        audio.addEventListener("timeupdate", function () {
            // if duration is not NaN
            if (this.duration) {
                // update current time
                let currentMinutes = Math.floor(audio.currentTime / 60);
                let currentSeconds = Math.floor(
                    audio.currentTime - currentMinutes * 60
                );

                // current second
                currentSeconds < 10
                    ? (currentSeconds = "0" + currentSeconds)
                    : currentSeconds;
                // current minute
                currentMinutes < 10
                    ? (currentMinutes = "0" + currentMinutes)
                    : currentMinutes;

                currentTimeText.textContent = `${currentMinutes}:${currentSeconds}`;

                // move process bar
                const progressPercent = Math.floor(
                    (this.currentTime / this.duration) * 100
                );

                progress.value = progressPercent;
            }
        });

        // seek (play back / fast foward): oninput
        // * when seeking, pause song so it's not cause disturbing noise
        progress.addEventListener("input", function (e) {
            audio.pause();

            const seekTime = (audio.duration / 100) * e.target.value;
            audio.currentTime = seekTime;
        });

        // when finish seeking, play song
        progress.addEventListener("change", function (e) {
            audio.play();
        });

        // move to next song
        next.addEventListener("click", function () {
            if (_this.isRandom) {
                _this.playRandomSong();
            } else {
                _this.nextSong();
            }
            audio.play();
            _this.scrollToActiveSong();
        });

        // move to previous song
        prev.addEventListener("click", function () {
            // * in case not wanting songs autoplay when click prev
            // if (_this.isPlaying) {
            //     _this.isPlaying = false;
            //     player.classList.remove("playing");
            //     cdThumbAnimate.pause();
            // }
            // progress.value = 0;
            if (_this.isRandom) {
                _this.playRandomSong();
            } else {
                _this.prevSong();
            }
            audio.play();
            _this.scrollToActiveSong();
        });

        // random
        random.addEventListener("click", function (e) {
            // add active class when click on neither "div" or its child "i".
            // e.target.tagName == "DIV"
            //     ? e.target.classList.add("active")
            //     : e.target.parentElement.classList.add("active");

            _this.isRandom = !_this.isRandom;
            // set config random
            _this.setConfig("isRandom", _this.isRandom);

            // if isRandom = true then add, else remove
            random.classList.toggle("active", _this.isRandom);
        });

        // repeat current song
        repeat.addEventListener("click", function () {
            _this.isRepeat = !_this.isRepeat;
            // set config random
            _this.setConfig("isRepeat", _this.isRepeat);

            repeat.classList.toggle("active", _this.isRepeat);
        });

        // when song ended, play next song or repeat
        audio.addEventListener("ended", function () {
            if (_this.isRepeat) {
                audio.play();
            } else {
                next.click();
            }
        });

        // listen when click on anything inside playlist
        playlist.addEventListener("click", function (e) {
            // closest() find and return a node that matches the specified CSS selector, whether it is parent or child
            const songEle = e.target.closest(".song:not(.active)");
            if (songEle || e.target.closest(".option")) {
                // handle when click on song
                if (songEle) {
                    // cách 1: getAttribute
                    // let chooseIndex = Number.parseInt(
                    //     songEle.getAttribute("data-index")
                    // );

                    // cách 2: dùng dataset với các attribute "data-*"
                    let chooseIndex = Number.parseInt(songEle.dataset.index);

                    _this.currentIndex = chooseIndex;
                    _this.loadCurrentSong();
                    audio.play();
                }

                // handle when click on option button
                // ...
            }
        });

        // get time duration of a song
        audio.addEventListener("durationchange", (e) => {
            let durationMinutes = Math.floor(e.target.duration / 60);
            let durationSeconds = Math.floor(
                e.target.duration - durationMinutes * 60
            );

            // duration second
            durationSeconds < 10
                ? (durationSeconds = "0" + durationSeconds)
                : durationSeconds;
            // current minute
            durationMinutes < 10
                ? (durationMinutes = "0" + durationMinutes)
                : durationMinutes;

            currentTimeText.textContent = `00:00`;
            totalDuration.textContent = `${durationMinutes}:${durationSeconds}`;
        });
    },

    loadCurrentSong() {
        heading.textContent = this.currentSong.name;

        cdThumb.style.backgroundImage = `url(${this.currentSong.image})`;

        audio.src = this.currentSong.path;
    },

    loadConfig() {
        this.isRandom = this.config.isRandom;
        this.isRepeat = this.config.isRepeat;
    },

    nextSong() {
        this.currentIndex++;
        if (this.currentIndex >= this.songs.length) {
            this.currentIndex = 0;
        }
        this.loadCurrentSong();
    },

    prevSong() {
        this.currentIndex--;
        if (this.currentIndex < 0) {
            this.currentIndex = this.songs.length - 1;
        }
        this.loadCurrentSong();
    },

    playRandomSong() {
        if (playedSongs.length >= this.songs.length) {
            playedSongs.length = 0; // clear array
        }

        let newRandomIndex = this.currentIndex;
        let isDublicated = false;
        // loop happens when newRandomIndex is not dublicate from currentIndex AND not existed in playedSongs array
        do {
            // creat random number from 0 to 3
            newRandomIndex = Math.floor(Math.random() * this.songs.length);

            if (playedSongs.includes(newRandomIndex)) {
                isDublicated = true;
            } else {
                isDublicated = false;
            }
        } while (newRandomIndex === this.currentIndex || isDublicated === true);

        playedSongs.push(newRandomIndex);

        this.currentIndex = newRandomIndex;
        this.loadCurrentSong();
    },

    // add active class for a song (red background)
    activeSong() {
        const allSong = $$(".song");

        let oldActiveSong = document.querySelector(".song.active");
        if (oldActiveSong !== null) {
            oldActiveSong.classList.remove("active");
        }

        let activeSong = allSong[this.currentIndex];
        activeSong.classList.add("active");
    },

    // scroll to active song
    scrollToActiveSong() {
        // DOM to currentSong
        let currSong = $$(".song")[this.currentIndex];

        // if currentSong offsetTop <= 179 - 69, it will have difference scroll behavior
        const limit =
            dashboard.offsetHeight - currSong.getBoundingClientRect().height;
        if (
            cd.getBoundingClientRect().height === 0 &&
            currSong.getBoundingClientRect().top <= limit
        ) {
            // console.log("smaller than limit");
            setTimeout(() => {
                $(".song.active").scrollIntoView({
                    behavior: "smooth",
                    block: "end",
                    inline: "nearest",
                });
            }, 150);
        } else {
            // console.log("bigger than limit");
            setTimeout(() => {
                $(".song.active").scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "nearest",
                });
            }, 150);
        }
    },

    // run when program starts
    start() {
        // define new properties
        this.defineProperties();

        // listen / handle all events
        this.handleEvents();

        // load first song into UI
        this.loadCurrentSong();

        // load config settings in localStorage
        this.loadConfig();

        // render song info to playlist
        this.render();

        random.classList.toggle("active", this.isRandom);
        repeat.classList.toggle("active", this.isRepeat);
    },

    // active song (add class "active" to a song)
};

// run program
app.start();
