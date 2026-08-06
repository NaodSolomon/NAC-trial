import TeamCard from '@/features/team/components/TeamCard';
import AnimateOnScroll from '@/components/common/AnimateOnScroll';
import { teamMembers } from '@/features/team/data';

export default function TeamGrid() {
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
      {teamMembers.map((member) => (
        <AnimateOnScroll key={member.slug} animation="fadeUp">
          <TeamCard
            image={member.image}
            name={member.name}
            role={member.role}
            slug={member.slug}
            social={member.social}
          />
        </AnimateOnScroll>
      ))}
    </div>
  );
}
