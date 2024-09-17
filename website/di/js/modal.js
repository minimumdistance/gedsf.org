

// Object to store person data
const personData = {
    'cypher': {
      name: 'Cypher',
      image: 'images/Cypher-Bio.png',
      bio: 'Known for his clever wit and street smarts, Cypher dominates the urban jungle as a graffiti artist, leaving his signature marks on the walls of the digital landscape. His vibrant colors and sharp eyes reflect his ability to unlock even the most secure vaults, making him the ultimate master of digital keys. When it comes to encryption, Cypher knows the power lies in holding the key.'
    },

    'bolt': {
      name: 'Bolt',
      image: 'images/Bolt-Bio.png',
      bio: 'As a street artist, Bolt’s graffiti is known for its bold lines and fierce energy, mirroring his role as the protector of the digital fortress. With his unbreakable defenses and watchful stance, Bolt ensures that once something is locked, it’s secured for good. He’s the enforcer of encryption, making sure no lock gets cracked on his watch.'
    },

    'andres-vega': {
      name: 'Andres Vega',
      image: 'images/Andres-Vega-Bio.png',
      bio: 'Andrés Vega Arias is a recognized expert in cloud security and encryption technologies. With extensive experience in securing digital infrastructures, he has played a pivotal role in implementing advanced data protection strategies. Andrés has contributed to numerous industry initiatives and projects, focusing on enhancing privacy and security in cloud environments. He frequently shares his expertise through thought leadership and speaking engagements, making him a highly sought-after voice in the cybersecurity community.',
      linkedin: 'https://www.linkedin.com/in/avegaarias/'
    },

    'andrew-schaffer': {
      name: 'Andrew Clay Schaffer',
      image: 'images/Andrew-Schaffer-Bio.png',
      bio: 'Andrew Clay Shafer is a pioneering figure in DevOps and cloud computing, known for his influential work in advancing continuous delivery and cloud-native infrastructure. A frequent speaker and thought leader, Andrew has contributed to the development of foundational concepts that shape modern software development and operations. With deep experience across a range of technologies, he continues to drive innovation in cloud architecture and operational strategies, making him a respected voice in the tech industry.',
      linkedin: 'https://www.linkedin.com/in/andrewclayshafer/'
    },

    'chris-hanson': {
      name: 'Christopher Hanson',
      image: 'images/chris-hanson-bio.png',
      bio: 'Chris Hanson is a highly regarded cloud-native expert with a deep focus on Kubernetes and container technologies. With extensive experience in designing and deploying scalable, resilient cloud infrastructure, Chris has become a thought leader in the DevOps and cloud-native community. His hands-on expertise and leadership have made him a trusted figure in guiding organizations through cloud transformations. Chris frequently shares his knowledge at industry events and will be leading a training session at the Global Encryption Day event.',
      linkedin: 'https://www.linkedin.com/in/cloud-native-chris/'
    },

    'david-aronchick': {
      name: 'David Aronchick',
      image: 'images/David-Aronchick-Bio.png',
      bio: 'David Aronchick is a visionary in cloud computing and AI, known for his contributions to the development of Kubernetes and other groundbreaking technologies. As a leader in open-source innovation, Joseph has played a key role in shaping modern cloud infrastructure and machine learning platforms. His deep technical expertise and thought leadership make him a prominent figure in the tech community, frequently sharing insights at industry conferences and events.',
      linkedin: 'https://www.linkedin.com/in/aronchick/'
    },

    'deep-patel': {
      name: 'Deep Patel',
      image: 'images/Deep-Patel-Bio.png',
      bio: 'Deep Patel is a leading expert in cybersecurity and cloud infrastructure, with a focus on building secure and scalable platforms. Throughout his career, he has been instrumental in designing and implementing advanced security strategies for global enterprises. Deep is a sought-after speaker and thought leader in the field of digital security, sharing his deep knowledge of encryption, data protection, and cloud technologies at numerous industry events.',
      linkedin: 'https://www.linkedin.com/in/dehatideep/'
    },

    'hart-montgomery': {
      name: 'Hart Montgomery',
      image: 'images/Hart-Montgomery-Bio.png',
      bio: 'CTO of the Hyperledger Foundation part of the Linux Foundation',
      linkedin: 'https://www.linkedin.com/in/hartmontgomery/'
    },
    // Add more people here...
  };
  
 
  const modal = document.getElementById("personModal");
  

  const span = document.getElementsByClassName("close")[0];
  

  function openModal(personId) {
    const person = personData[personId];
    if (person) {
      document.getElementById("personImage").src = person.image;
      document.getElementById("personName").textContent = person.name;
      document.getElementById("personBio").textContent = person.bio;

      if (person.linkedin) {
        document.getElementById("personBio").innerHTML = document.getElementById("personBio").textContent + "<br><br>" + "<a href=" + person.linkedin + ">" + person.linkedin + "</a>";        
      }

      modal.style.display = "block";
    }
  }
  

  span.onclick = function() {
    modal.style.display = "none";
  }
  

  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  }
  

  document.querySelectorAll('.project-title p.learn-more').forEach(element => {
    element.addEventListener('click', function(e) {
      e.preventDefault();
      const personId = this.closest('.project-background').dataset.person;
      openModal(personId);
    });
  });