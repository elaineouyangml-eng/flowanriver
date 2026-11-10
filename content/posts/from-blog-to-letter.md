---
title: "From Blog to Letter: A Little Space for Your Thoughts on Flowanriver"
slug: from-blog-to-letter
date: 2026-11-10T12:34:00.000+08:00
draft: false
tags:
  - AI
  - Flowanriver
  - Letter
  - Web3
  - Personal Stories
description: Discover how Flowanriver grew from a personal blog into an
  interactive space with Letter, a way to write to your future self, built with
  help from AI.
cover:
  image: /images/from-blog-to-letter-at-sunset.png
  alt: A peaceful sunset over a river, with an open notebook, handwritten letter,
    sealed envelope, laptop, and hourglass on a wooden desk, illustrating
    Flowanriver’s journey from blog to Letter
---
Recently, I've come across a few celebrities writing letters to their younger selves, sometimes looking back five, ten, or even twenty years. They talk about what life was like back then, the decisions they made, and things they wish they'd known earlier. I enjoyed reading some of those letters, but they also got me thinking. What would it be like to write a letter in the other direction, to someone I haven't become yet?

Have you ever had something on your mind that felt too personal to share, but you weren't sure where to put it? Maybe it's something you're worried about, a plan you're not ready to tell anyone, or just a few thoughts you want to get out of your head. Do you keep a diary, send yourself messages, or type things into your phone's notes?

I use different ways to keep track of things, and I imagine most people do too. The trouble is that those little records tend to disappear under everything else. Unless we deliberately go looking for them, we might never read them again.

That made me wonder about something else. What if I could write down how I feel today, choose a date a year from now, and have those words arrive in my inbox when I've almost forgotten about them?

That was the idea behind **Letter**, a new feature I've been building on Flowanriver. You can write a message to your future self and choose when you'd like to receive it.

I also wanted it to be somewhere people could put thoughts they don't necessarily want to share publicly. Not every feeling needs an audience, and not everything we write has to become a social media post.

For Flowanriver, Letter is also a small change in direction. Until recently, the site was mostly a place where I published articles. Now I'm beginning to experiment with things visitors can actually use.

## Why I Started Flowanriver

When I first built Flowanriver, I wasn't thinking about creating an app or a platform. I simply wanted my own website, somewhere I could write about whatever interested me without constantly wondering whether it fitted a social media algorithm.

I spend quite a lot of time reading about AI, Web3, cryptocurrency, and the ways technology is changing how people work and communicate. Sometimes I come across an idea I agree with, sometimes I don't, and quite often I end up with more questions than answers. Having a blog gave me somewhere to work through those thoughts without worrying too much about whether a topic was trending.

There was another reason I wanted an independent website.

The more I learned about blockchain and Web3, the more I started thinking about who actually controls what we create online. We put so much of our writing, photos, and work onto platforms owned by other companies. They're useful, of course, but the rules can change, accounts can be restricted, and we don't always have much say in what happens to our content.

I liked the idea of having a little more control over my own work. Perhaps, as decentralized technologies develop, creators will have better ways to manage their intellectual property and the value of what they produce.

I'm aware that running a website doesn't automatically make anything decentralized. I still depend on hosting, a domain provider, and other services. But having my own space felt like a reasonable first step.

The thing is, building and maintaining a website isn't something everyone knows how to do. I certainly didn't know everything when I started, and I still don't. I've spent a fair amount of time figuring out settings, changing code, fixing layouts, and occasionally wondering why something that worked yesterday suddenly stopped working today.

AI has helped me through quite a few of those moments.

For a while, I was happy just writing articles. But eventually I started thinking about the people who came to read them. They could read my experiences and opinions, but there wasn't much for them to do on the site.

I wondered whether I could create something simple that would let visitors leave something of their own, even if they didn't have a blog or know anything about building websites.

That's how Letter became my next experiment.

## A Quiet Place to Write Something Down

When I started thinking about Letter, I wasn't particularly interested in creating a complicated product. I wanted something simple enough that someone could open the page, write a few words, and leave them there without feeling they had to explain themselves.

We spend a surprising amount of time communicating with other people, but sometimes it's harder to sit down and figure out what we want to say to ourselves.

![Flowanriver Letters to the Future introduction page, inviting visitors to write personal messages and send them to their future selves.](/images/flowanriver-letters-to-the-future-introduction.png "Flowanriver Letters to the Future – A Quiet Space for Your Thoughts")

Maybe you're having a difficult week at work. Maybe you've started something new and you're excited about it, but also a little nervous. Or perhaps there's something you've been thinking about for months that you haven't quite worked out.

You don't always need advice. Sometimes you just want to write it down.

With Letter, you can write about what's happening in your life now and choose a future date for that message to be delivered to your email. It could be in a few months, a year, or on a date that means something to you.

I like the idea that the message might arrive when you aren't expecting to think about those things anymore.

Imagine writing about a project you're struggling with today and reading that letter a year later. Perhaps you've finished it, or perhaps you decided to do something completely different. Either way, you get a chance to see what was on your mind before you knew how things would turn out.

And there's no need to make the letter sound impressive. It doesn't need a beautiful opening or a meaningful ending. You can write exactly what you want.

I think of Letter as a small, private writing space rather than a place for publicly sharing personal stories. Since letters can contain sensitive thoughts, the way they're handled and stored matters too. That's something I've been paying attention to while building the feature, and it remains part of the work as I continue testing it.

## The Part Where I Had to Make It Work

Coming up with the idea was easy enough. Building it was another story.

I'm not a developer, although I've become more comfortable working with websites and making changes to code with AI's help. Still, I hadn't built anything quite like this before.

At first, I thought the process would be fairly straightforward. Someone writes a letter, chooses a delivery date, and the system sends it when the time comes.

Then I started looking at what actually needed to happen behind the scenes.

There was the form itself, storing the information, handling the delivery date, connecting an email service, and making sure the system could run scheduled tasks. Each part brought its own questions.

I worked through them with ChatGPT, discussing what I wanted the feature to do, looking at different approaches, and gradually putting the pieces together.

There were moments when I thought everything was ready, only to discover that something still wasn't working. I'd go back to the settings, check the logs, ask another question, make a change, and test again.

Sometimes the problem was in the code. Sometimes it was a configuration I'd overlooked. And occasionally an AI suggestion sounded perfectly reasonable but didn't actually solve anything, so we had to try another approach.

I also spent time understanding how scheduled tasks work. Cloudflare's [Cron Triggers documentation](https://developers.cloudflare.com/workers/configuration/cron-triggers/) was one of the technical references for that part of the process.

I won't pretend I understood every technical detail immediately. There were plenty of times when I needed an explanation in plain language before I could decide what to do next.

But something interesting happened along the way. The more problems I worked through, the less intimidating the next one seemed. I started recognizing which settings were worth checking and what information might help explain why something had failed.

Eventually, after another round of testing, I received the test email.

I opened my inbox and there it was.

It was only a test message, but I remember being genuinely pleased. I'd spent so much time looking at code, settings, and error messages that seeing an actual email arrive felt surprisingly satisfying.

Of course, receiving one test email doesn't mean the whole feature is finished or that future deliveries are guaranteed. A system that sends letters months or years later needs to keep working long after someone has closed the page. I'll need to continue checking how reliable the process is and what happens when something goes wrong.

Still, that first successful test was an encouraging moment.

I sometimes think about how I would have approached this a few years ago. If I'd wanted to add a feature like Letter, I probably would have assumed I needed to hire someone to build it. Now, with AI, I can at least explore the possibilities myself and see how far I can get.

That doesn't mean AI does all the work or always gives the right answers. I still have to test what it suggests, make decisions, and sometimes start over when an approach doesn't work.

But I like being able to try.

## What Else Could Flowanriver Become?

I'm still figuring that out.

Alongside Letter, I've recently been working on another experiment: bringing Flowanriver into the Pi Network ecosystem through the Pi Developer platform.

I wrote about the earlier stages in [Flowanriver Joins the Pi Network Ecosystem: Starting on Testnet](https://flowanriver.com/posts/flowanriver-pi-network-testnet/). At the time, I was beginning to explore how the website might work within Pi's test environment.

Since then, I've continued working through the developer setup, Testnet configuration, and wallet-related features. There's a lot to learn, especially when you're approaching it without a traditional software development background.

For a long time, I'd mainly written about Pi Network and other Web3 projects from the perspective of someone researching how their ecosystems work. I'd read about applications, real-world utility, community participation, and the challenges of building something people actually use.

Eventually, I wanted to find out what that looked like from the development side.

It's quite different when you're the one trying to make something work.

I've been referring to the official [Pi Network developer documentation](https://developers.minepi.com/docs/build-first-app/GettingStarted) while learning how the platform and its application setup work.

At one point, I even considered joining the current Pi Hackathon. I looked into the requirements and thought about putting a team together. I know people who would be interested in participating, although finding people with development experience is another matter.

As I got further into the actual setup, I realized there were still quite a few things to work through. I haven't decided whether I'll participate this time, and I don't particularly want to rush the project just to enter a competition.

I'd rather understand what I'm building and get the basic features working properly.

For now, the Pi-related work is still in development and testing. I don't know exactly where it will lead, but I'm learning things I wouldn't have learned by simply reading about the ecosystem.

And that's roughly where Flowanriver stands today.

It began as a personal blog. Now there's Letter, and I'm exploring what it might look like as an application within a Web3 ecosystem. Perhaps I'll add other tools or services in the future. I've even thought about the possibility of offering products through the site someday.

Some of those ideas may happen, and others might change as I learn more. I don't have a detailed roadmap for everything yet, and I'm not particularly worried about that.

I'd like Flowanriver to have room to change as I do.

## A Letter I Might Write Myself

Now that Letter is taking shape, I've been thinking about what I would actually write in my own first letter.

I could write about the work I'm doing right now, the things I'm hoping to accomplish, and the projects that still feel a little uncertain.

I might tell my future self about building Letter with AI, the test email that finally arrived, and all the small problems that seemed so annoying at the time.

I'd probably mention the Pi development work too, because I'm curious to know what will have happened with it a year from now.

Perhaps I'll open that letter and laugh at how much I worried about certain things. Maybe I'll be surprised that some of the ideas actually worked out. Or maybe I'll still be working on a few of them.

I'd like to find out.

If you'd like to try writing to your own future self, you can visit [Flowanriver](https://flowanriver.com/letters/) and explore Letter.

It doesn't have to be anything serious. You could write about today, a goal you have in mind, or something you've been meaning to tell yourself. If you're not sure how to begin, you could simply write:

*Dear future me, how are things going?*

Then choose a date and let the letter wait for you.

I've no idea what Flowanriver will look like a year from now, but I think I'll write that letter myself. It might be fun to find out what I was right about, what I got completely wrong, and what I never saw coming.

And perhaps that's a good enough reason to write to our future selves in the first place.

*Flowanriver Letter has completed its initial development and email delivery testing, and I'm continuing to improve it. I'll keep monitoring how reliably it works, particularly for future deliveries. If you run into any problems or have suggestions, feel free to reach out through the Contact page.*
