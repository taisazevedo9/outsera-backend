const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API RESTful - Outsera Backend',
    version: '1.0.0',
    description: 'RESTful API with Express, SQLite and Swagger',
    contact: {
      name: 'API Support'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development Server'
    }
  ],
  tags: [


    {
      name: 'Awards',
      description: 'Operations related to Golden Raspberry Awards'
    }
  ],
  components: {
    schemas: {

      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string'
          }
        }
      },

    }
  },
  paths: {

    '/api/awards/producers-intervals': {
      get: {
        tags: ['Awards'],
        summary: 'Get producers with longest and shortest interval between awards',
        description: 'Returns the producer with the longest interval between two consecutive awards',
        responses: {
          200: {
            description: 'Award intervals for producers',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    min: {
                      type: 'array',
                      description: 'Producers with shortest interval between awards',
                      items: {
                        type: 'object',
                        properties: {
                          producer: {
                            type: 'string',
                            description: 'Producer name'
                          },
                          interval: {
                            type: 'integer',
                            description: 'Interval in years between awards'
                          },
                          previousWin: {
                            type: 'integer',
                            description: 'Year of previous win'
                          },
                          followingWin: {
                            type: 'integer',
                            description: 'Year of following win'
                          }
                        }
                      }
                    },
                    max: {
                      type: 'array',
                      description: 'Producers with longest interval between awards',
                      items: {
                        type: 'object',
                        properties: {
                          producer: {
                            type: 'string',
                            description: 'Producer name'
                          },
                          interval: {
                            type: 'integer',
                            description: 'Interval in years between awards'
                          },
                          previousWin: {
                            type: 'integer',
                            description: 'Year of previous win'
                          },
                          followingWin: {
                            type: 'integer',
                            description: 'Year of following win'
                          }
                        }
                      }
                    }
                  }
                },
                examples: {
                  'example-1': {
                    value: {
                      min: [
                        {
                          producer: 'producer',
                          interval: 1,
                          previousWin: 1991,
                          followingWin: 1993
                        }
                      ],
                      max: [
                        {
                          producer: 'producer',
                          interval: 11,
                          previousWin: 2003,
                          followingWin: 2016
                        }
                      ]
                    }
                  }
                }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    }

  }
};

module.exports = swaggerDefinition;
