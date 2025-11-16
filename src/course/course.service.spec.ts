import { Test, TestingModule } from '@nestjs/testing';
import { CourseService } from './course.service';
import { getModelToken } from '@nestjs/mongoose';
import { Course } from './schema/course.schema';
import { User } from '../user/schema/user.schema';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { UserRole } from '../user/schema/user.schema';

describe('CourseService', () => {
  let service: CourseService;
  let mockCourseModel: any;
  let mockUserModel: any;
  let mockUserService: any;

  const mockCourse = {
    _id: 'course123',
    courseId: 'CS101',
    courseName: 'Introduction to Computer Science',
    description: 'Basic CS course',
    duration: '3 months',
    numberOfStudents: 0,
    capacity: 50,
    tutors: [],
    save: jest.fn(),
  };

  const mockTutor = {
    _id: 'tutor456',
    email: 'tutor@example.com',
    name: 'Tutor Name',
    role: UserRole.TUTOR,
  };

  beforeEach(async () => {
    mockCourseModel = jest.fn().mockImplementation(() => ({
      save: jest.fn(),
    }));
    mockCourseModel.find = jest.fn();
    mockCourseModel.findById = jest.fn();
    mockCourseModel.findByIdAndUpdate = jest.fn();
    mockCourseModel.deleteOne = jest.fn();

    mockUserModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    mockUserService = {
      findById: jest.fn(),
      updateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        {
          provide: getModelToken(Course.name),
          useValue: mockCourseModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCourse', () => {
    it('should create a new course', async () => {
      const createCourseDto = {
        courseId: 'CS101',
        courseName: 'Introduction to Computer Science',
        subject: 'Computer Science',
        description: 'Basic CS course',
        duration: '3 months',
        registrationStart: new Date('2024-01-01').toISOString(),
        registrationEnd: new Date('2024-01-15').toISOString(),
        courseStart: new Date('2024-02-01').toISOString(),
        courseEnd: new Date('2024-05-01').toISOString(),
        numberOfStudents: 0,
        capacity: 50,
        tutor: '',
      };

      const savedCourse = {
        _id: 'course123',
        ...createCourseDto,
        tutors: [],
      };

      mockCourseModel.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(savedCourse),
      }));

      const result = await service.createCourse(createCourseDto);

      expect(result).toBeDefined();
      expect(result).toEqual(savedCourse);
    });

    it('should create course with tutors if provided', async () => {
      const createCourseDto = {
        courseId: 'CS102',
        courseName: 'Data Structures',
        subject: 'Computer Science',
        description: 'Advanced data structures',
        duration: '4 months',
        registrationStart: new Date('2024-01-01').toISOString(),
        registrationEnd: new Date('2024-01-15').toISOString(),
        courseStart: new Date('2024-02-01').toISOString(),
        courseEnd: new Date('2024-05-01').toISOString(),
        numberOfStudents: 0,
        capacity: 40,
        tutor: '',
      };

      const savedCourse = {
        _id: 'course124',
        ...createCourseDto,
        tutors: ['tutor1', 'tutor2'],
      };

      mockCourseModel.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(savedCourse),
      }));

      const result = await service.createCourse(createCourseDto);

      expect(result).toBeDefined();
      expect(result.tutors).toEqual(['tutor1', 'tutor2']);
    });
  });

  describe('getAllCourses', () => {
    it('should return an array of courses', async () => {
      const mockCourses = [
        {
          _id: '1',
          courseId: 'CS101',
          courseName: 'Course 1',
          numberOfStudents: 10,
          capacity: 50,
        },
        {
          _id: '2',
          courseId: 'CS102',
          courseName: 'Course 2',
          numberOfStudents: 15,
          capacity: 40,
        },
      ];

      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockCourses);

      mockCourseModel.find.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      populateMock.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      const result = await service.getAllCourses();

      expect(result).toEqual(mockCourses);
      expect(result.length).toBe(2);
      expect(mockCourseModel.find).toHaveBeenCalled();
      expect(populateMock).toHaveBeenCalledWith('tutors');
      expect(populateMock).toHaveBeenCalledWith('students');
    });

    it('should return empty array when no courses exist', async () => {
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue([]);

      mockCourseModel.find.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      populateMock.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      const result = await service.getAllCourses();

      expect(result).toEqual([]);
      expect(mockCourseModel.find).toHaveBeenCalled();
    });
  });

  describe('getCourseById', () => {
    it('should return a course by id', async () => {
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockCourse);

      mockCourseModel.findById.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      populateMock.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      const result = await service.getCourseById('course123');

      expect(result).toEqual(mockCourse);
      expect((result as any).courseId).toBe('CS101');
      expect(mockCourseModel.findById).toHaveBeenCalledWith('course123');
      expect(populateMock).toHaveBeenCalledWith('tutors');
    });

    it('should throw NotFoundException when course not found', async () => {
      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(null);

      mockCourseModel.findById.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      populateMock.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      await expect(service.getCourseById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getCourseById('nonexistent')).rejects.toThrow(
        'Course not found',
      );
    });
  });

  describe('updateCourse', () => {
    it('should update a course', async () => {
      const updateDto = {
        courseName: 'Updated Course Name',
        description: 'Updated description',
      };

      const mockUpdatedCourse = {
        ...mockCourse,
        ...updateDto,
      };

      mockCourseModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUpdatedCourse),
      });

      const result = await service.updateCourse('course123', updateDto);

      expect(result).toEqual(mockUpdatedCourse);
      expect(result.courseName).toBe('Updated Course Name');
      expect(mockCourseModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'course123',
        updateDto,
        { new: true },
      );
    });

    it('should throw NotFoundException when updating non-existent course', async () => {
      const updateDto = { courseName: 'Updated Name' };

      mockCourseModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateCourse('nonexistent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update only provided fields', async () => {
      const updateDto = { capacity: 60 };

      const mockUpdatedCourse = {
        ...mockCourse,
        capacity: 60,
      };

      mockCourseModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUpdatedCourse),
      });

      const result = await service.updateCourse('course123', updateDto);

      expect(result.capacity).toBe(60);
      expect(result.courseName).toBe(mockCourse.courseName);
    });
  });

  describe('deleteCourse', () => {
    it('should delete a course', async () => {
      mockCourseModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await service.deleteCourse('course123');

      expect(result).toEqual({ message: 'Course deleted successfully' });
      expect(mockCourseModel.deleteOne).toHaveBeenCalledWith({
        _id: 'course123',
      });
    });

    it('should throw NotFoundException when deleting non-existent course', async () => {
      mockCourseModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      await expect(service.deleteCourse('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteCourse('nonexistent')).rejects.toThrow(
        'Course not found',
      );
    });
  });

  describe('assignTutorToCourse', () => {
    it('should assign a tutor to a course', async () => {
      const courseId = 'course123';
      const tutorId = 'tutor456';

      mockUserModel.findById.mockResolvedValue(mockTutor);

      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue({
        ...mockCourse,
        tutors: [],
        save: jest.fn().mockResolvedValue({
          ...mockCourse,
          tutors: [tutorId],
        }),
      });

      mockCourseModel.findById.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      populateMock.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      const result = await service.assignTutorToCourse(courseId, tutorId);

      expect(result).toBeDefined();
      expect(result.tutors).toContain(tutorId);
      expect(mockUserModel.findById).toHaveBeenCalledWith(tutorId);
    });

    it('should throw NotFoundException when tutor not found', async () => {
      const courseId = 'course123';
      const tutorId = 'tutor456';

      mockUserModel.findById.mockResolvedValue(null);

      // Mock the course findById for when it tries to check the course
      const execMock = jest.fn().mockResolvedValue(mockCourse);
      mockCourseModel.findById.mockReturnValue({
        exec: execMock,
      });

      await expect(
        service.assignTutorToCourse(courseId, tutorId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.assignTutorToCourse(courseId, tutorId),
      ).rejects.toThrow('Tutor not found');
    });

    it('should throw BadRequestException when user is not a tutor', async () => {
      const courseId = 'course123';
      const userId = 'user456';

      const mockStudent = {
        ...mockTutor,
        role: UserRole.STUDENT,
      };

      mockUserModel.findById.mockResolvedValue(mockStudent);

      // Mock the course findById for when it tries to check the course
      const execMock = jest.fn().mockResolvedValue(mockCourse);
      mockCourseModel.findById.mockReturnValue({
        exec: execMock,
      });

      await expect(
        service.assignTutorToCourse(courseId, userId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.assignTutorToCourse(courseId, userId),
      ).rejects.toThrow('User is not a tutor');
    });

    it('should not assign duplicate tutor', async () => {
      const courseId = 'course123';
      const tutorId = 'tutor456';

      mockUserModel.findById.mockResolvedValue(mockTutor);

      const populateMock = jest.fn().mockReturnThis();
      const courseWithTutor = {
        ...mockCourse,
        tutors: [tutorId],
        save: jest.fn().mockResolvedValue({
          ...mockCourse,
          tutors: [tutorId],
        }),
      };
      const execMock = jest.fn().mockResolvedValue(courseWithTutor);

      mockCourseModel.findById.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      populateMock.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      const result = await service.assignTutorToCourse(courseId, tutorId);

      expect(result.tutors.length).toBe(1);
      expect(result.tutors).toContain(tutorId);
    });
  });

  describe('unassignTutorFromCourse', () => {
    it('should remove a tutor from a course', async () => {
      const courseId = 'course123';
      const tutorId = 'tutor456';

      const populateMock = jest.fn().mockReturnThis();
      const courseWithTutors = {
        ...mockCourse,
        tutors: [
          { _id: tutorId, toString: () => tutorId },
          { _id: 'tutor789', toString: () => 'tutor789' },
        ],
        save: jest.fn().mockResolvedValue({
          ...mockCourse,
          tutors: [{ _id: 'tutor789', toString: () => 'tutor789' }],
        }),
      };
      const execMock = jest.fn().mockResolvedValue(courseWithTutors);

      mockCourseModel.findById.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      populateMock.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      const result = await service.unassignTutorFromCourse(courseId, tutorId);

      expect(result).toBeDefined();
      expect(courseWithTutors.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when course not found', async () => {
      const courseId = 'course123';
      const tutorId = 'tutor456';

      const populateMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(null);

      mockCourseModel.findById.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      populateMock.mockReturnValue({
        populate: populateMock,
        exec: execMock,
      });

      await expect(
        service.unassignTutorFromCourse(courseId, tutorId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});