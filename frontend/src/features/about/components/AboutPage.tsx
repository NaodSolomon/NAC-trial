import Image from 'next/image';
import { Users, Heart, LifeBuoy } from 'lucide-react';
import PageBanner from '@/components/common/PageBanner';
import SectionHeading from '@/components/common/SectionHeading';
import AnimateOnScroll from '@/components/common/AnimateOnScroll';
import CounterSection from '@/components/common/CounterSection';
import CTASection from '@/components/common/CTASection';
import SponsorLogos from '@/components/common/SponsorLogos';
import TeamCard from '@/features/team/components/TeamCard';
import { teamMembers } from '@/features/team/data';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { counterItems, sponsorLogos, faqs } from '@/features/about/data';

export default function AboutPage() {
  return (
    <>
      {/* 1. Page Banner */}
      <PageBanner
        title="About Us"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'About Us' }]}
      />

      {/* 2. Mission Section */}
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
                  <Image src="/images/signature.png" alt="CEO Signature" width={120} height={50} />
                  <div>
                    <p className="text-heading font-serif font-semibold">Brandon Munson</p>
                    <p className="text-foreground text-sm">CEO</p>
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

          {/* Highlight Boxes */}
          <div className="mt-16 grid grid-cols-1 gap-0 md:grid-cols-3">
            <div className="flex gap-4 border bg-white p-8">
              <div className="text-primary text-4xl">
                <Users className="size-10" />
              </div>
              <div>
                <h3 className="text-heading font-serif font-semibold">Volunteering</h3>
                <p className="text-foreground mt-2 text-sm">
                  Join our global network of volunteers and make a direct impact in the lives of
                  those who need it most.
                </p>
              </div>
            </div>
            <div className="bg-primary flex gap-4 p-8 text-white">
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
              <div className="text-primary text-4xl">
                <LifeBuoy className="size-10" />
              </div>
              <div>
                <h3 className="text-heading font-serif font-semibold">Help &amp; Support</h3>
                <p className="text-foreground mt-2 text-sm">
                  We provide comprehensive support services including counseling, legal aid, and
                  emergency assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Counter Section */}
      <CounterSection items={counterItems} />

      {/* 4. Team Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading
            title="Our"
            highlightedWord="Volunteers"
            subtitle="Meet the dedicated individuals who donate their time and skills to make our mission possible."
            align="center"
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

      {/* 5. CTA Section */}
      <CTASection
        title="Join with us to provide food for African Hungry People"
        buttonLabel="Join With Us"
        buttonHref="/contact"
      />

      {/* 6. FAQ Section */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-4xl px-4">
          <SectionHeading title="Frequently Asked" highlightedWord="Questions" align="center" />

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="font-serif text-base font-semibold text-heading">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* 7. Sponsor Logos */}
      <SponsorLogos logos={sponsorLogos} />
    </>
  );
}
