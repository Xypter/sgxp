export default interface Sheet {
    id: number;
    attributes: {
      title: string;
      createdAt: string;
      updatedAt: string;
      publishedAt: string;
      slug: string;
      spritesheet: {
        data: {
          attributes: {
            url: string;
          }
        }
      }
    };
  }