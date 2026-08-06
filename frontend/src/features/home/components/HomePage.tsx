import Image from 'next/image';
import Link from 'next/link';
import { Users, Heart, LifeBuoy } from 'lucide-react';
import HeroSlider from '@/components/common/HeroSlider';
import SectionHeading from '@/components/common/SectionHeading';
import EventCard from '@/components/common/EventCard';
import CounterSection from '@/components/common/CounterSection';
import TestimonialCarousel from '@/components/common/TestimonialCarousel';
import SponsorLogos from '@/components/common/SponsorLogos';
import CTASection from '@/components/common/CTASection';
import NewsletterSection from '@/components/common/NewsletterSection';
import AnimateOnScroll from '@/components/common/AnimateOnScroll';
import BlogCard from '@/features/blog/components/BlogCard';
import TeamCard from '@/features/team/components/TeamCard';
import { Progress } from '@/components/ui/progress';
import {
  slides,
  counterItems,
  events,
  teamMembers,
  testimonials,
  blogPosts,
  sponsorLogos,
  galleryImages,
} from '@/features/home/data';

export default function HomePage() {
  return (
    <>
      {/* 1. Hero Slider */}
      <HeroSlider slides={slides} />

      {/* 2. Mission / About Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <AnimateOnScroll animation="fadeLeft">
              <div>
                <SectionHeading title="Our" highlightedWord="Mission" align="left" />
                <p className="text-foreground">
                  We are dedicated to protecting children&apos;s rights and building a safe future
                  for the most vulnerable communities. Since our founding, we have provided
                  education, healthcare, and legal advocacy to thousands of families in need. Our
                  mission is to empower individuals and communities to break the cycle of poverty
                  and create lasting, positive change.
                </p>
                <div className="mt-8 flex items-center gap-4">
                  <Image
                    src="/images/signature.png"
                    alt="CEO Signature"
                    width={120}
                    height={50}
                  />
                  <div>
                    <p className="font-serif font-semibold text-heading">Brandon Munson</p>
                    <p className="text-sm text-foreground">CEO, Generosity Club</p>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
            <AnimateOnScroll animation="fadeRight">
              <Image
                src="/images/volunteers.jpg"
                alt="Our volunteers in action"
                width={600}
                height={400}
                className="rounded-lg shadow-lg"
              />
            </AnimateOnScroll>
          </div>

          {/* 3. Highlight Boxes */}
          <div className="mt-12 grid grid-cols-1 gap-0 md:grid-cols-3">
            <div className="flex gap-4 border bg-white p-8">
              <div className="text-4xl text-primary">
                <Users className="size-10" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-heading">Volunteering</h3>
                <p className="mt-2 text-sm text-foreground">
                  Join our global network of volunteers and make a direct impact in the lives of
                  those who need it most.
                </p>
              </div>
            </div>
            <div className="flex gap-4 bg-primary p-8 text-white">
              <div className="text-4xl text-white">
                <Heart className="size-10" />
              </div>
              <div>
                <h3 className="font-serif font-semibold">Fundraising</h3>
                <p className="mt-2 text-sm text-white/80">
                  Start your own fundraising campaign or contribute to an existing one to help us
                  reach our goals faster.
                </p>
              </div>
            </div>
            <div className="flex gap-4 border bg-white p-8">
              <div className="text-4xl text-primary">
                <LifeBuoy className="size-10" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-heading">Help &amp; Support</h3>
                <p className="mt-2 text-sm text-foreground">
                  We provide comprehensive support services including counseling, legal aid, and
                  emergency assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Urgent Cause Section */}
      <section className="bg-secondary-bg py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <AnimateOnScroll animation="fadeLeft">
                <Image
                  src="/images/about-us.jpg"
                  alt="Urgent cause - Education for all"
                  width={700}
                  height={450}
                  className="rounded-lg"
                />
              </AnimateOnScroll>
            </div>
            <div className="lg:col-span-5">
              <AnimateOnScroll animation="fadeRight">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Urgent Cause
                </span>
                <hr className="my-3 h-0.5 w-12 border-0 bg-primary" />
                <h2 className="font-serif text-3xl font-medium text-heading">
                  Ensure Education for All
                </h2>
                <p className="mt-4 text-foreground">
                  Every child deserves access to quality education regardless of their background
                  or circumstances. Our education program provides scholarships, school supplies,
                  and learning resources to underprivileged communities. Help us build more schools
                  and train teachers to create brighter futures.
                </p>
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-heading">TARGET: $10,000</span>
                    <span className="font-semibold text-heading">RAISED: $6,000</span>
                  </div>
                  <Progress value={60} />
                  <p className="mt-1 text-right text-xs font-bold text-primary">60%</p>
                </div>
                <div className="mt-6 flex gap-4">
                  <Link
                    href="/about"
                    className="inline-block rounded bg-text-dark px-6 py-2.5 text-xs font-semibold uppercase text-white transition hover:bg-black"
                  >
                    View Details
                  </Link>
                  <Link
                    href="/donate"
                    className="inline-block rounded bg-primary px-6 py-2.5 text-xs font-semibold uppercase text-white transition hover:bg-primary-hover"
                  >
                    Donate Now
                  </Link>
                </div>
              </AnimateOnScroll>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Counter Section */}
      <CounterSection items={counterItems} />

      {/* 6. Events Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading
            title="Upcoming"
            highlightedWord="Events"
            subtitle="Join us at our upcoming events and be a part of the change you wish to see in the world."
            align="center"
          />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <AnimateOnScroll key={event.slug} animation="fadeUp">
                <EventCard {...event} />
              </AnimateOnScroll>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/events"
              className="font-semibold text-primary transition hover:text-primary-dark"
            >
              Load All Events &raquo;
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Team Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading
            title="Our"
            highlightedWord="Volunteer"
            subtitle="Meet the dedicated individuals who donate their time and skills to make our mission possible."
            align="left"
          />
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {teamMembers.map((member) => (
              <AnimateOnScroll key={member.slug} animation="fadeUp">
                <TeamCard {...member} />
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CTA Section */}
      <CTASection
        title="Awesome Voluntary Work"
        buttonLabel="Join With Us"
        buttonHref="/contact"
      />

      {/* 9. Testimonials Section */}
      <TestimonialCarousel
        title="What People Say"
        highlightedWord="Say"
        subtitle="Hear from the people whose lives have been touched by our work."
        testimonials={testimonials}
      />

      {/* 10. Latest News Section */}
      <section className="bg-secondary-bg py-20">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading
            title="Latest"
            highlightedWord="News"
            subtitle="Stay up to date with the latest stories, updates, and insights from our organization."
            align="center"
          />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <AnimateOnScroll key={post.slug} animation="fadeUp">
                <BlogCard {...post} />
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Gallery Section */}
      <section className="bg-secondary-bg py-20">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading
            title="Photo"
            highlightedWord="Archives"
            subtitle="Browse through moments captured during our events, campaigns, and community outreach programs."
            align="center"
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {galleryImages.map((img, index) => (
              <div
                key={index}
                className="relative aspect-square overflow-hidden rounded-lg"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. Sponsors Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading
            title="Our"
            highlightedWord="Sponsors"
            subtitle="We are grateful to our sponsors and partners who make our work possible through their generous support."
            align="left"
          />
        </div>
        <SponsorLogos logos={sponsorLogos} />
      </section>

      {/* 13. Newsletter Section */}
      <NewsletterSection />
    </>
  );
}
